"""
One game's summary: read its reviews, count the facts, ask the model, check the answer.

Facts come from code, words from the model:
    code   reads the reviews, counts the vibes, the checklist's majority answers and the
           pros and cons, cleans the review text, and checks everything the model writes
    model  writes the summary and names the aspects, each with the reviews that back it
The prompt (prompts.py) asks; the checks here enforce. A broken answer gets ONE retry with
the exact problems; if that fails too, nothing is returned and the old summary stays.
Scores never come from the model, and an aspect only survives if 2+ real reviews back it.
"""

import json
import logging
import re
from collections import Counter
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from imgm_ai.data.db import connect
from imgm_ai.models.llm import get_model
from imgm_ai.summary.prompts import REQUEST, RETRY_PROMPT, REVIEW, SYSTEM_PROMPT

log = logging.getLogger("imgm_ai.summary")

MIN_REVIEWS = 3  # fewer than this: no summary (the page says why)
MIN_SUPPORT = 2  # reviews that must back an aspect
MAX_ASPECTS = 9
MAX_REVIEWS_READ = (
    60  # the most helpful ones: a fair picture, and the prompt stays small
)
TEXT_LIMIT = 700  # characters of each review's text
SUMMARY_LENGTH = (150, 900)  # characters
SENTENCES = (2, 6)
COPIED_WORDS = 8  # this many words in a row from one review = a quote, not a summary

CHECKLIST_FIELDS = [
    "graphics", "gameplay", "audio", "story", "difficulty", "grind",
    "gameLength", "bugs", "pcRequirements", "worthPrice", "replay",
]  # fmt: skip

# Signs the model was steered by a review, or is talking about itself
META_WORDS = re.compile(
    r"\b(instructions?|prompt|as an ai|language model|ignore (all|previous|the)|system message|imgm)\b",
    re.IGNORECASE,
)
LINK = re.compile(
    r"(https?://|www\.|\b[\w-]+\.(com|net|org|io|gg|ly|xyz)\b|@\w{2,})", re.IGNORECASE
)
FIRST_PERSON = re.compile(r"\b(I|I'm|I've|me|my|we|our|you|your)\b")


class Aspect(BaseModel):
    label: str = Field(description="1-3 words in Title Case naming a part of the game.")
    sentiment: Literal["positive", "mixed", "negative"]
    review_ids: list[str] = Field(
        description="Ids of the reviews that discuss it, e.g. 'r3'."
    )


class GameSummary(BaseModel):
    summary: str = Field(
        description="3-5 sentences on what players think (see the rules)."
    )
    aspects: list[Aspect] = Field(description="4-9 aspects players talk about.")


# ── Reading the reviews ──────────────────────────────────


def load_reviews(game_id: int) -> tuple[str | None, int, list[dict]]:
    """(the game's title, how many reviews it has, the most helpful MAX_REVIEWS_READ)."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute('SELECT title FROM "Game" WHERE id = %(id)s', {"id": game_id})
        game = cur.fetchone()
        cur.execute(
            'SELECT count(*) AS n FROM "Review" WHERE "gameId" = %(id)s',
            {"id": game_id},
        )
        total = cur.fetchone()["n"]
        cur.execute(
            f"""
            SELECT id, rating, "reviewText" AS text, pros, cons, vibes, "bestMoment" AS best,
                   "worstMoment" AS worst, "hasSpoilers" AS spoilers,
                   {", ".join(f'"{f}"' for f in CHECKLIST_FIELDS)}
            FROM "Review" WHERE "gameId" = %(id)s
            ORDER BY "helpfulScore" DESC, "createdAt" DESC
            LIMIT {MAX_REVIEWS_READ}
            """,
            {"id": game_id},
        )
        return (game["title"] if game else None), total, cur.fetchall()


def clean(text: str | None, limit: int = TEXT_LIMIT) -> str:
    """Player text made safe to place in the prompt.

    Tags are neutralized (a review can't close its <review> element or open a fake one),
    links are dropped, control characters and runs of whitespace are flattened.
    """
    if not text:
        return ""
    text = text.replace("<", "‹").replace(">", "›")
    text = LINK.sub("[link]", text)
    text = re.sub(r"[\x00-\x1f\x7f]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit] + "…" if len(text) > limit else text


def facts(reviews: list[dict]) -> str:
    """What the reviews' clickable answers add up to, counted by code."""
    vibes = Counter(v for r in reviews for v in r["vibes"] or [])
    pros = Counter(clean(p, 60).lower() for r in reviews for p in r["pros"] or [])
    cons = Counter(clean(c, 60).lower() for r in reviews for c in r["cons"] or [])
    lines = [f"Reviews below: {len(reviews)}"]
    if vibes:
        lines.append(
            "Vibes players picked: "
            + ", ".join(f"{v.replace('_', ' ')} ({c})" for v, c in vibes.most_common(6))
        )
    for field in CHECKLIST_FIELDS:
        answers = Counter(r[field] for r in reviews if r[field] and r[field] != "na")
        if sum(answers.values()) >= 2:
            answer, count = answers.most_common(1)[0]
            lines.append(
                f"Checklist {field}: most answered '{answer}' ({count} of {sum(answers.values())})"
            )
    if pros:
        lines.append(
            "Most listed pros: "
            + ", ".join(f"{p} ({c})" for p, c in pros.most_common(6))
        )
    if cons:
        lines.append(
            "Most listed cons: "
            + ", ".join(f"{p} ({c})" for p, c in cons.most_common(6))
        )
    return "\n".join(lines)


def review_element(short_id: str, r: dict) -> str:
    """One review as the model reads it. Spoiler moments are left out."""
    parts = []
    if r["pros"]:
        parts.append("Pros: " + "; ".join(clean(p, 80) for p in r["pros"]))
    if r["cons"]:
        parts.append("Cons: " + "; ".join(clean(c, 80) for c in r["cons"]))
    if not r["spoilers"]:
        if r["best"]:
            parts.append("Best moment: " + clean(r["best"], 200))
        if r["worst"]:
            parts.append("Worst moment: " + clean(r["worst"], 200))
    if r["text"]:
        parts.append("Review: " + clean(r["text"]))
    return REVIEW.format(
        id=short_id, rating=r["rating"], body="\n".join(parts) or "(score only)"
    )


# ── Checking the answer ──────────────────────────────────


def copied_from(summary: str, texts: list[str]) -> str | None:
    """A run of COPIED_WORDS words the summary shares with a review, if any."""
    words = re.findall(r"[a-z']+", summary.lower())
    runs = {
        " ".join(words[i : i + COPIED_WORDS])
        for i in range(len(words) - COPIED_WORDS + 1)
    }
    for text in texts:
        flat = " ".join(re.findall(r"[a-z']+", text.lower()))
        for run in runs:
            if run in flat:
                return run
    return None


def summary_problems(summary: str, title: str, texts: list[str]) -> list[str]:
    """What's wrong with the summary text (empty = it can be shown)."""
    problems = []
    low, high = SUMMARY_LENGTH
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", summary) if s.strip()]
    if not low <= len(summary) <= high:
        problems.append(
            f"The summary must be {low}-{high} characters (it was {len(summary)})."
        )
    if not SENTENCES[0] <= len(sentences) <= SENTENCES[1]:
        problems.append("The summary must be 3 to 5 sentences.")
    if re.search(
        r"\d", summary.replace(title, "")
    ):  # the title may have digits ("Expedition 33")
        problems.append(
            "No numbers in the summary (no scores, counts, hours or percentages)."
        )
    if LINK.search(summary):
        problems.append("No links, websites or handles in the summary.")
    if META_WORDS.search(summary):
        problems.append(
            "Don't mention rules, prompts, AI or the site; write only about the game."
        )
    if FIRST_PERSON.search(summary):
        problems.append("Third person only: no 'I', 'my', 'we' or 'you'.")
    if run := copied_from(summary, texts):
        problems.append(f'Paraphrase, don\'t copy reviews (you copied: "{run}").')
    return problems


def checked_aspects(aspects: list[Aspect], ids: dict[str, str]) -> list[dict]:
    """The aspects real reviews back, cleaned up and ordered (praised first)."""
    kept, seen = [], set()
    for aspect in aspects:
        label = re.sub(r"\s+", " ", aspect.label).strip(" .,'\"")
        support = {
            ids[i] for i in aspect.review_ids if i in ids
        }  # only real reviews count
        if (
            not label
            or len(label) > 30
            or len(label.split()) > 4
            or label.lower() in seen
            or LINK.search(label)
            or META_WORDS.search(label)
            or len(support) < MIN_SUPPORT
        ):
            continue
        seen.add(label.lower())
        kept.append(
            {"label": label, "sentiment": aspect.sentiment, "support": len(support)}
        )
    order = {"positive": 0, "mixed": 1, "negative": 2}
    kept.sort(key=lambda a: (order[a["sentiment"]], -a["support"]))
    return kept[:MAX_ASPECTS]


# ── The summary ──────────────────────────────────────────


def summarize_game(game_id: int) -> dict | None:
    """The game's summary and aspects, or None if it has fewer than MIN_REVIEWS reviews.

    Raises if the model can't produce an answer that passes the checks (after one retry):
    the caller then keeps the old summary.
    """
    title, total, reviews = load_reviews(game_id)
    if not title or total < MIN_REVIEWS:
        return None
    ids = {
        f"r{i + 1}": r["id"] for i, r in enumerate(reviews)
    }  # short ids are easier to copy
    texts = [t for r in reviews for t in [r["text"], r["best"], r["worst"]] if t]
    request = REQUEST.format(
        title=clean(title, 120),
        facts=facts(reviews),
        reviews="\n".join(review_element(short, r) for short, r in zip(ids, reviews)),
    )
    messages = [SystemMessage(SYSTEM_PROMPT), HumanMessage(request)]
    model = get_model(lambda m: m.with_structured_output(GameSummary))

    for attempt in (1, 2):
        result: GameSummary | None = model.invoke(
            messages,
            config={
                "run_name": "game_summary",
                "metadata": {"game_id": game_id, "attempt": attempt},
            },
        )
        summary = re.sub(r"\s+", " ", result.summary).strip() if result else ""
        aspects = checked_aspects(result.aspects, ids) if result else []
        problems = (
            summary_problems(summary, title, texts)
            if summary
            else ["The summary was empty."]
        )
        if len(aspects) < 2:
            problems.append(
                "List at least 4 aspects, each backed by 2 or more reviews (ids copied exactly)."
            )
        if not problems:
            log.info(
                "Summary for game %s: %d reviews read, %d aspects, attempt %d",
                game_id,
                len(reviews),
                len(aspects),
                attempt,
            )
            return {
                "summary": summary,
                "aspects": aspects,
                "reviews_read": len(reviews),
                "review_count": total,
            }
        log.warning(
            "Summary for game %s, attempt %d, failed the checks: %s",
            game_id,
            attempt,
            problems,
        )
        previous = json.dumps(result.model_dump() if result else {}, ensure_ascii=False)
        messages = [
            *messages[:2],
            HumanMessage(
                f"Your previous answer:\n{previous}\n\n"
                + RETRY_PROMPT.format(problems="\n".join(f"- {p}" for p in problems))
            ),
        ]
    raise ValueError(f"No summary passed the checks for game {game_id}: {problems}")
