"""
The agent's line to IMGM's Express API, for data Express already knows how to
get (IGDB), so Python doesn't re-implement it.
"""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("IMGM_API_URL", "http://localhost:5000")


def search_games(query: str) -> list[dict]:
    """Search IGDB through Express. Games come back with IMGM ratings attached."""
    response = httpx.get(f"{API_URL}/api/games/search", params={"q": query}, timeout=15)
    response.raise_for_status()  # a 4xx/5xx becomes an exception, which ToolNode reports to the model
    return response.json()


def get_game(game_id: int) -> dict | None:
    """One game with its IMGM rating, through Express (None if it can't be found)."""
    response = httpx.get(f"{API_URL}/api/games/{game_id}", timeout=15)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()
