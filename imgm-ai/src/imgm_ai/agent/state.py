from typing import Literal, TypedDict

from langgraph.graph import MessagesState

from imgm_ai.agent.schemas import Recommendations


class Preferences(
    TypedDict, total=False
):  # total=False → every answer is optional (skippable)
    platforms: list[str]  # ["PC", "Nintendo Switch"]
    moods: list[str]  # ["cozy", "challenging"]
    session_length: Literal["short", "medium", "long"]
    play_style: Literal["solo", "coop", "online"]
    difficulty: Literal["relaxed", "balanced", "hard"]
    loved_games: list[str]  # titles for now; later IGDB ids from the game picker
    avoid: list[str]  # ["horror", "microtransactions"]


class RecommenderState(MessagesState):
    preferences: Preferences  # the player's answers, set once at the start
    recommendations: Recommendations | None  # the final cards (set by the format node)
    check_problems: list[str]  # what the last check found wrong (empty = passed)
    fix_attempts: int  # how many times the agent was sent back to fix its answer
