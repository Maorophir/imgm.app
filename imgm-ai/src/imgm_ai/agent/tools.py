"""
The agent's tools. The model reads each tool's name, docstring and argument types
to decide when and how to call it, so every docstring is part of the prompt.

Who the player is never comes from the model: tools read it from the run's
config (RunnableConfig), which the model can't see or change.
"""

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from imgm_ai.agent.events import emit, game_tile
from imgm_ai.data import imgm_api
from imgm_ai.data.db import (
    get_game,
    load_game_profile,
    load_player_game_ids,
    load_player_reviews,
)
from imgm_ai.rag.store import find_games_by_reviews


def imgm_rating_text(avg_rating, review_count: int) -> str:
    """An IMGM rating worded honestly for how much evidence there is.

    1 review → "rated 9/10 by 1 IMGM player" (one opinion, not a consensus)
    2 reviews → "... (early impressions)", 3+ → "averages 8.7/10 from 12 IMGM players"
    """
    if not review_count:
        return "no IMGM reviews yet"
    if review_count == 1:
        return f"rated {float(avg_rating):g}/10 by 1 IMGM player"
    note = " (early impressions)" if review_count < 3 else ""
    return f"averages {float(avg_rating):.1f}/10 from {review_count} IMGM players{note}"


def votes_list(rows: list[dict], key: str) -> str:
    """Rows with vote counts → text, e.g. "addictive (9), epic (4)"."""
    return ", ".join(f"{row[key]} ({row['votes']})" for row in rows)


def format_profile(title: str, profile: dict) -> str:
    """A game's community profile as a few compact lines. Empty sections are left out,
    so the model never reads "none" and mistakes it for an answer."""
    lines = [
        f"{title}: {imgm_rating_text(profile['avg_rating'], profile['review_count'])}"
    ]
    if profile["vibes"]:
        lines.append(f"Top vibes: {votes_list(profile['vibes'], 'vibe')}")
    if profile["got_good"]:
        lines.append(f"Got good after: {votes_list(profile['got_good'], 'answer')}")
    if profile["checklist"]:
        verdicts = ", ".join(
            f"{field}={top['answer']} ({top['votes']}/{top['answered']})"
            for field, top in profile["checklist"].items()
        )
        lines.append(f"Checklist (top answer, votes/answered): {verdicts}")
    if profile["compared_to"]:
        lines.append(
            f"Players compare it to: {votes_list(profile['compared_to'], 'title')}"
        )
    return "\n".join(lines)


@tool
def get_game_profile(game_id: int) -> str:
    """Look up what IMGM players think of a game: its average rating (1-10), number of
    reviews, top vibes, when it gets good, checklist verdicts (graphics, difficulty,
    story, length, price...) and the games players compare it to.
    Pass the game's id from search_games. Only useful for games that search_games
    shows with IMGM reviews."""
    game = get_game(game_id)
    if game is None:
        return f"No IMGM reviews for game {game_id} yet."
    profile = load_game_profile(game["id"])
    if profile["review_count"] == 0:
        return f"No IMGM reviews for {game['title']} yet."
    return format_profile(game["title"], profile)


def format_player_review(review: dict) -> str:
    """One of the player's reviews as one line, empty parts left out.

    → "- Hades: 9/10 · addictive, chaotic · 120h · completed_100 · PC"
    """
    parts = [
        f"{review['title']}: {review['rating']}/10",
        ", ".join(review["vibes"]),
        f"{review['hoursPlayed']}h" if review["hoursPlayed"] is not None else "",
        review["completionStatus"] or "",
        review["platform"] or "",
    ]
    return "- " + " · ".join(part for part in parts if part)


@tool
def get_my_taste(config: RunnableConfig) -> str:
    """Get the current player's own IMGM reviews (their ratings, vibes, hours played).
    Use it to learn what this player enjoys before recommending games."""
    # The config is injected by LangGraph and hidden from the model: it can't choose whose reviews
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return "The player isn't logged in, so there are no reviews to learn from."
    reviews = load_player_reviews(user_id)
    if not reviews:
        return "This player hasn't reviewed any games yet. Rely on their answers to the questions."
    lines = [format_player_review(r) for r in reviews]
    return (
        f"The player's IMGM reviews ({len(reviews)}, best-rated first):\n"
        + "\n".join(lines)
    )


def format_search_result(game: dict) -> str:
    """→ "- [id 113112] Hades (2020) · Supergiant Games · PC, Switch · Roguelike · rated 9/10 by 1 IMGM player\" """
    year = game["releaseDate"][:4] if game.get("releaseDate") else "?"
    imgm = game.get("ratings", {}).get("imgm")
    rating = imgm_rating_text(imgm, game.get("reviewCount", 0))
    platforms = ", ".join(game["platforms"])
    genres = ", ".join(game["genres"][:2])
    return f"- [id {game['id']}] {game['title']} ({year}) · {game.get('developer') or '?'} · {platforms} · {genres} · {rating}"


@tool
def search_games(query: str) -> str:
    """Search the full game catalog (IGDB) by title. Returns up to 5 real games, each with
    its id, year, developer, platforms, genres and IMGM rating. Use it to confirm a game
    exists and is on the player's platforms before recommending it. Use the id with
    get_game_profile."""
    games = imgm_api.search_games(query)[:5]
    if not games:
        return f"No games found for '{query}'."
    # For the page: the games being checked (the first result is the likely match)
    emit(
        {
            "type": "games",
            "source": "catalog",
            "query": query,
            "games": [
                game_tile(
                    {
                        "id": g["id"],
                        "title": g["title"],
                        "cover": g.get("coverUrl"),
                        "year": (g.get("releaseDate") or "")[:4] or None,
                        "platforms": g.get("platforms", []),
                        "rating": g.get("ratings", {}).get("imgm"),
                        "review_count": g.get("reviewCount", 0),
                    },
                    source="catalog",
                )
                for g in games
            ],
        }
    )
    return "\n".join(format_search_result(game) for game in games)


def format_review_match(game: dict) -> str:
    """One game found through reviews, e.g. '- [id 119304] Spiritfarer: 1 matching IMGM review (rated 9). Vibes: ...'."""
    count = game["matching_reviews"]
    ratings = ", ".join(str(r) for r in game["ratings"])
    noun = "review" if count == 1 else "reviews"
    return f"- [id {game['game_id']}] {game['title']}: {count} matching IMGM {noun} (rated {ratings}). {game['excerpt']}"


@tool
def search_imgm_reviews(query: str, config: RunnableConfig) -> str:
    """Find games by how IMGM players describe them: a mood, feeling or experience,
    e.g. "cozy and relaxing", "made me cry", "brutally hard but fair", "great with friends".
    Searches what players wrote (by meaning, not exact words) and returns the best
    matching games with their ids and a short quote from a matching review.
    Use it to discover candidates; then confirm them with search_games."""
    # Games the player already reviewed are left out: they've played them
    user_id = config.get("configurable", {}).get("user_id")
    played = load_player_game_ids(user_id) if user_id else []
    games = find_games_by_reviews(query, exclude_game_ids=played)
    if not games:
        return f"No IMGM reviews match '{query}' yet."
    # For the page: games IMGM players' reviews pointed to
    emit(
        {
            "type": "games",
            "source": "reviews",
            "query": query,
            "games": [
                game_tile(
                    {"id": g["game_id"], "title": g["title"], "cover": g["cover"]},
                    source="reviews",
                )
                for g in games
            ],
        }
    )
    return f"IMGM reviews matching '{query}', closest first:\n" + "\n".join(
        format_review_match(game) for game in games
    )


TOOLS = [get_my_taste, search_imgm_reviews, search_games, get_game_profile]
