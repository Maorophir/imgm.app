"""
Database access: the agent's read-only line into IMGM's Postgres.
Every query the agent runs lives in this file.

Two rules for every query here:
- Values always go in as placeholders (%(name)s), never with f-strings, so
  text that came from the model can't turn into SQL (SQL injection).
- Prisma created the tables, so table and camelCase column names need double
  quotes: "Game", "Review", "gameId".

Try it from imgm-ai/:
    uv run python -m imgm_ai.data.db
"""

import os

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()


def connect() -> psycopg.Connection:
    """Open a connection to IMGM's database. Rows come back as dicts."""
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)


# ── Finding a game ───────────────────────────────────────

FIND_GAME_QUERY = """
SELECT id, title
FROM "Game"
WHERE title ILIKE %(pattern)s                -- case-insensitive "contains"
ORDER BY lower(title) = lower(%(title)s) DESC,  -- the exact title first,
         length(title)                          -- then the shortest: "Hades" before "Hades II"
LIMIT 1
"""


def find_game(title: str) -> dict | None:
    """The best-matching game for a title: {"id", "title"}, or None if IMGM doesn't have it."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute(FIND_GAME_QUERY, {"pattern": f"%{title}%", "title": title})
        return cur.fetchone()


def get_game(game_id: int) -> dict | None:
    """A game by its IGDB id (IMGM uses the same ids): {"id", "title"}.

    None means nobody has opened or reviewed it on IMGM yet, so it has no IMGM
    reviews. Reviewing a game always saves it here first.
    """
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT id, title FROM "Game" WHERE id = %(game_id)s', {"game_id": game_id}
        )
        return cur.fetchone()


def load_game_covers(game_ids: list[int]) -> dict[int, str]:
    """Cover image URLs for these games (only games IMGM has saved): {id: url}."""
    if not game_ids:
        return {}
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT id, "coverUrl" AS cover FROM "Game" WHERE id = ANY(%(ids)s)',
            {"ids": game_ids},
        )
        return {row["id"]: row["cover"] for row in cur.fetchall()}


def count_games() -> int:
    """How many games are cached in IMGM's database."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute('SELECT count(*) AS games FROM "Game"')
        return cur.fetchone()["games"]


# ── A player's own reviews ───────────────────────────────
# user_id always comes from the run's config (the verified login), never from the model.

PLAYER_REVIEWS_QUERY = """
SELECT g.title, r.rating, r.vibes, r."hoursPlayed", r."completionStatus", r.platform
FROM "Review" r
JOIN "Game" g ON g.id = r."gameId"
WHERE r."userId" = %(user_id)s
ORDER BY r.rating DESC, r."updatedAt" DESC   -- favorites first
LIMIT 15                                     -- keeps it small for the 8K context
"""


def load_player_reviews(user_id: str) -> list[dict]:
    """The player's own reviews, best-rated first (at most 15)."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute(PLAYER_REVIEWS_QUERY, {"user_id": user_id})
        return cur.fetchall()


# ── A game's community profile ───────────────────────────
# Each query summarizes one kind of review answer for one game (by id).

RATING_QUERY = """
SELECT round(avg(rating)::numeric, 1) AS avg_rating,  -- 8.666… → 8.7 (NULL with 0 reviews)
       count(*)                       AS review_count
FROM "Review"
WHERE "gameId" = %(game_id)s
"""

# vibes is an array column ({addictive,epic}): unnest turns each vibe into its own row
VIBES_QUERY = """
SELECT vibe, count(*) AS votes
FROM "Review" r, unnest(r.vibes) AS vibe
WHERE r."gameId" = %(game_id)s
GROUP BY vibe
ORDER BY votes DESC
LIMIT 5
"""

GOT_GOOD_QUERY = """
SELECT "gotGoodAfter" AS answer, count(*) AS votes
FROM "Review"
WHERE "gameId" = %(game_id)s AND "gotGoodAfter" IS NOT NULL
GROUP BY "gotGoodAfter"
ORDER BY votes DESC
"""

# The checklist is 11 separate columns. VALUES (...) turns each review's 11
# columns into 11 rows of (field, answer), so one GROUP BY counts them all.
CHECKLIST_QUERY = """
SELECT c.field, c.answer, count(*) AS votes
FROM "Review" r,
     LATERAL (VALUES
        ('graphics', r.graphics), ('gameplay', r.gameplay), ('audio', r.audio),
        ('story', r.story), ('difficulty', r.difficulty), ('grind', r.grind),
        ('gameLength', r."gameLength"), ('bugs', r.bugs),
        ('pcRequirements', r."pcRequirements"), ('worthPrice', r."worthPrice"),
        ('replay', r.replay)
     ) AS c(field, answer)
WHERE r."gameId" = %(game_id)s AND c.answer IS NOT NULL
GROUP BY c.field, c.answer
ORDER BY c.field, votes DESC
"""

# "It's like ___ meets ___": the games reviewers compared this one to
COMPARED_QUERY = """
SELECT g.title, count(*) AS votes
FROM "Review" r
JOIN "Game" g ON g.id IN (r."comparedAId", r."comparedBId")
WHERE r."gameId" = %(game_id)s
GROUP BY g.title
ORDER BY votes DESC
LIMIT 3
"""


def load_game_profile(game_id: int) -> dict:
    """Everything IMGM players said about one game, summarized. One connection, five queries.

    {
      "avg_rating": 9.0, "review_count": 1,
      "vibes":       [{"vibe": "addictive", "votes": 1}, ...],
      "got_good":    [{"answer": "instantly", "votes": 1}, ...],
      "checklist":   {"difficulty": {"answer": "brain", "votes": 1, "answered": 1}, ...},
      "compared_to": [{"title": "Dead Cells", "votes": 1}, ...],
    }
    """
    params = {"game_id": game_id}
    with connect() as conn, conn.cursor() as cur:
        cur.execute(RATING_QUERY, params)
        profile = dict(cur.fetchone())

        cur.execute(VIBES_QUERY, params)
        profile["vibes"] = cur.fetchall()

        cur.execute(GOT_GOOD_QUERY, params)
        profile["got_good"] = cur.fetchall()

        cur.execute(CHECKLIST_QUERY, params)
        profile["checklist"] = top_answer_per_field(cur.fetchall())

        cur.execute(COMPARED_QUERY, params)
        profile["compared_to"] = cur.fetchall()

    return profile


def top_answer_per_field(rows: list[dict]) -> dict:
    """Checklist rows (sorted by field, most votes first) → each field's top answer.

    [{"field": "story", "answer": "good", "votes": 5}, {"field": "story", "answer": "tears", "votes": 2}]
      → {"story": {"answer": "good", "votes": 5, "answered": 7}}
    """
    fields = {}
    for row in rows:
        field = fields.setdefault(
            row["field"],
            {"answer": row["answer"], "votes": row["votes"], "answered": 0},
        )
        # how many reviewers answered this category at all
        field["answered"] += row["votes"]
    return fields


def load_player_game_ids(user_id: str) -> list[int]:
    """Ids of every game this player has reviewed: games they've already played."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT "gameId" AS game_id FROM "Review" WHERE "userId" = %(user_id)s',
            {"user_id": user_id},
        )
        return [row["game_id"] for row in cur.fetchall()]


# ── Reviews for the RAG index ────────────────────────────

INDEX_REVIEWS_QUERY = """
SELECT r.id, r."gameId" AS game_id, g.title, g.genres, r."userId" AS user_id,
       r.rating, r.vibes, r.pros, r.cons,
       r."hoursPlayed" AS hours_played, r."completionStatus" AS completion_status,
       r."playStyle" AS play_style, r."gotGoodAfter" AS got_good_after,
       r.graphics, r.gameplay, r.audio, r.story, r.difficulty, r.grind,
       r."gameLength" AS game_length, r.bugs, r."pcRequirements" AS pc_requirements,
       r."worthPrice" AS worth_price, r.replay,
       r."bestMoment" AS best_moment, r."worstMoment" AS worst_moment,
       r."hasSpoilers" AS has_spoilers, r."reviewText" AS review_text,
       r."updatedAt" AS updated_at
FROM "Review" r
JOIN "Game" g ON g.id = r."gameId"
"""


def load_reviews_for_index() -> list[dict]:
    """Every review, with its game's title and genres, ready to become a RAG document."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute(INDEX_REVIEWS_QUERY)  # no placeholders: it reads every review
        return cur.fetchall()


if __name__ == "__main__":
    print("Games in IMGM:", count_games())
    game = find_game("hades")
    print("find_game('hades'):", game)
    if game:
        print("Profile:", load_game_profile(game["id"]))
