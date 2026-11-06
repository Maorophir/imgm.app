"""
The daily Guess the game's quote clue: a line from the game that fans would know,
without the game's name. Express asks once a day, right after it picks the day's game
(lib/daily.js), and saves the answer with the puzzle.

The model remembers lines; code checks them:
    model  suggests a few lines from memory, names already blanked ("___")
    code   keeps a line only if a web search finds it word for word on a page about
           the game, and blanks any title word the model left in
In a test on 2026-11-06, Gemini Flash gave a real line for 9 of 10 famous games, and
the one it reworded (The Last of Us) the search caught. A Google Search tool for the
model didn't do better, so it isn't used. Swearing is starred by Express (dailyQuote.js),
like every other quote.
"""

import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_tavily import TavilySearch
from pydantic import BaseModel, Field

from imgm_ai.models.llm import get_model

log = logging.getLogger("imgm_ai.daily_quote")

LINES = 3  # lines asked for: one misremembered line doesn't cost the day its quote
WORDS = (5, 35)  # a line this long, counting the blanks
# Words in the longest stretch without a blank: what the search looks for. 4 was too
# few: "You can do this" (Celeste) turned up on a shop page, as any short phrase would.
MIN_PIECE = 5

# Any page (not the agent's trusted sites): quotes live on wikis, forums and fan pages
search = TavilySearch(max_results=5, search_depth="basic")

SYSTEM_PROMPT = """You help with a daily guess-the-game puzzle. Players see a line spoken
in the game as a clue, so it must sound like the game, and must not give the answer away
on its own.

Give lines exactly as they are said in the game, word for word. Only lines you are sure
of: a line you are not certain is word for word is worse than no line.
Rules for each line:
- 6 to 30 words, said by a character, a narrator or the game itself
- no title of the game or its series
- replace every character, place and faction name with ___
- prefer lines fans quote and remember"""

REQUEST = 'The game: "{title}" ({year}). Give up to {count} lines, best first.'


class Line(BaseModel):
    quote: str = Field(description="The line, word for word, names replaced with ___.")
    speaker: str = Field(description="Who says it (never shown to players).")


class Lines(BaseModel):
    lines: list[Line] = Field(description="Up to 3 lines, best first. Empty if unsure.")


def _normal(text: str) -> str:
    """Lowercase letters, digits and single spaces: quotes differ in punctuation and
    apostrophes from page to page."""
    text = text.lower().replace("’", "'")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9' ]", " ", text)).strip()


def _blank_title(quote: str, title: str) -> str:
    """Any word of the title the model left in (3+ letters, not a common word) → ___."""
    common = {"the", "and", "of", "for", "edition", "game", "remastered"}
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z']{2,}", title) if w.lower() not in common]
    for word in words:
        quote = re.sub(rf"\b{re.escape(word)}\b", "___", quote, flags=re.IGNORECASE)
    return quote


def _found_online(quote: str, title: str) -> str | None:
    """The address of a page that has the line word for word, or None.

    The search looks for the longest stretch between blanks (a page has the names, not
    our ___), and the page's text must contain it exactly, give or take punctuation.
    """
    pieces = [p.strip(" ,.!?…;:-\"'") for p in re.split(r"_+", quote)]
    longest = max(pieces, key=lambda p: len(p.split()), default="")
    if len(longest.split()) < MIN_PIECE:
        return None
    try:
        found = search.invoke({"query": f'"{longest}" {title}'})
    except Exception:
        log.exception("Quote search failed")
        return None
    wanted = _normal(longest)
    for result in found.get("results", []):
        if wanted in _normal(result.get("content", "")):
            return result.get("url")
    return None


def find_quote(title: str, year: int | None) -> dict | None:
    """{"text", "speaker", "found_at"} for a line checked online, or None."""
    model = get_model(lambda m: m.with_structured_output(Lines), timeout=25)
    try:
        answer = model.invoke(
            [
                SystemMessage(SYSTEM_PROMPT),
                HumanMessage(REQUEST.format(title=title, year=year or "year unknown", count=LINES)),
            ]
        )
    except Exception:
        log.exception("Quote model failed for %s", title)
        return None

    for line in (answer.lines if answer else [])[:LINES]:
        text = _blank_title(line.quote.strip().strip('"“”'), title)
        if not WORDS[0] <= len(text.split()) <= WORDS[1]:
            continue
        url = _found_online(text, title)
        if url:
            return {"text": text, "speaker": line.speaker, "found_at": url}
        log.info("Quote for %s not found online: %r", title, text)
    return None
