"""
The agent's final answer as structured data: what the website turns into cards.

Pydantic models do two jobs: they tell the model the exact shape to return
(field descriptions are part of the prompt), and they validate what comes back.
"""

from typing import Literal

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
    # A severe self-grade (Reflexion's idea, without an extra model call): the check node
    # sends weak picks back once to be replaced
    fit: Literal["strong", "weak"] = Field(
        default="strong",
        description=(
            "Be a severe critic. 'weak' if the game does not match what the player asked for "
            "(mood, difficulty, length, who they play with), or if it is a small spin-off, demo "
            "or fan-made version of a game they named. Otherwise 'strong'."
        ),
    )
    fit_note: str | None = Field(
        default=None,
        description="If weak: one short reason, e.g. 'too easy for \"not easy\"'.",
    )


class PlayedGame(BaseModel):
    """A game the player said they already played (or don't want)."""

    game_id: int = Field(description="The game's id, copied exactly from verified_games.")
    title: str = Field(description="The game's title.")


class Recommendations(BaseModel):
    """The guide's full answer: an intro and exactly 5 game cards."""

    intro: str = Field(description="The guide's one-sentence intro.")
    games: list[GameCard] = Field(description="Exactly 5 games, Best Pick first.")
    # "I already played the first two": remembered like "Not for me" (the format node
    # adds them to `rejected`), so they're replaced now and never suggested again
    played: list[PlayedGame] = Field(
        default_factory=list,
        description=(
            "Games the player's LATEST request says they already played, finished or don't "
            "want (positions count in the previous answer's order). Empty if none."
        ),
    )
    follow_up: str | None = Field(
        default=None,
        description="The guide's closing question to the player, if it asked one.",
    )
    # The check node stops enforcing the game-length answer when the guide set it aside
    length_set_aside: bool = Field(
        default=False,
        description=(
            "True only if the answer says it set aside the player's game-length answer "
            "(short/long) because their message asked for something else. Otherwise false."
        ),
    )
    # Read from the player's requests (not the answer): the check node enforces it
    max_hours: float | None = Field(
        default=None,
        description=(
            "Only if the player asked for short or shorter games (e.g. 'shorter ones', "
            "'something quick', 'I can finish this weekend'): the most hours a game may take "
            "to beat. Use their number if they gave one, otherwise 10. Otherwise null."
        ),
    )
