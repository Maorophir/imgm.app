"""
The agent's final answer as structured data: what the website turns into cards.

Pydantic models do two jobs: they tell the model the exact shape to return
(field descriptions are part of the prompt), and they validate what comes back.
"""

from pydantic import BaseModel, Field


class GameCard(BaseModel):
    """One recommended game: one card on the page."""

    game_id: int = Field(
        description="The game's id, copied exactly from a search_games result ('[id N]')."
    )
    title: str = Field(description="The game's title as search_games shows it.")
    why: str = Field(
        description="Why this game fits THIS player, in the guide's own words (2-3 sentences)."
    )
    best_pick: bool = Field(description="True for the guide's Best Pick only.")


class Recommendations(BaseModel):
    """The guide's full answer: an intro and exactly 5 game cards."""

    intro: str = Field(description="The guide's one-sentence intro.")
    games: list[GameCard] = Field(description="Exactly 5 games, Best Pick first.")
    follow_up: str | None = Field(
        default=None,
        description="The guide's closing question to the player, if it asked one.",
    )
