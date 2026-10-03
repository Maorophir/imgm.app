"""
Live events from inside the agent, for the page's side panel.

Tools call emit() to share what they found (games, with covers) while the agent is
still working. LangGraph delivers these as "custom" stream events; the server
forwards them to the browser. Outside a streamed run (e.g. a tool called
directly in a test) emit() does nothing.
"""

from langgraph.config import get_stream_writer


def emit(event: dict) -> None:
    """Send one event to whoever is streaming this run, if anyone is."""
    try:
        writer = get_stream_writer()
    except (RuntimeError, KeyError):  # not inside a streamed graph run
        return
    writer(event)


def game_tile(game: dict, *, source: str) -> dict:
    """A game as the page shows it while the agent is considering it."""
    return {
        "id": game["id"],
        "title": game["title"],
        "cover": game.get("cover"),
        "year": game.get("year"),
        "platforms": game.get("platforms", []),
        # Unknown values stay None (not 0), so merging tiles never overwrites a real count
        "rating": game.get("rating"),  # IMGM average
        "review_count": game.get("review_count"),
        "source": source,  # "reviews" (found through IMGM reviews) or "catalog" (checked in IGDB)
    }
