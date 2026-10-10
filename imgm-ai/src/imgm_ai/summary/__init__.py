"""
Game summaries: the "what players think" block on a game page (like IMDb's).

    prompts.py  the instructions and how the reviews are laid out for the model
    game.py     reading the reviews, the facts counted by code, the model call, and
                the checks that make the output safe to show (with one retry)
"""

from imgm_ai.summary.game import summarize_game

__all__ = ["summarize_game"]
