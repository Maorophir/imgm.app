import time
from typing import Annotated, Literal, TypedDict

from langchain_core.messages import HumanMessage
from langgraph.graph import MessagesState

from imgm_ai.agent.schemas import Recommendations


class Preferences(
    TypedDict, total=False
):  # total=False → every answer is optional (skippable)
    platforms: list[str]  # ["PC", "Nintendo Switch"]
    moods: list[str]  # ["cozy", "challenging"]
    # What they want to spend their hours DOING (the quest's screen 3, up to 2)
    wants_to: list[
        Literal["story", "combat", "explore", "puzzles", "build", "strategy", "runs", "compete"]
    ]
    session_length: Literal["short", "medium", "long"]  # one sitting: 15 min · 1-2h · evenings
    game_length: list[
        Literal["short", "medium", "long"]
    ]  # the whole game: <10h · 10-30h · 30h+ (any of them)
    # "coop" = chats saved before the quest (now "couch" or "online")
    play_style: Literal["solo", "couch", "online", "competitive", "coop"]
    difficulty: Literal["relaxed", "balanced", "hard"]
    loved_games: list[str]  # titles for now; later IGDB ids from the game picker
    avoid: list[str]  # ["horror", "microtransactions"]


# The check's feedback is a HumanMessage too; this name tells it apart from the player
CHECK_FEEDBACK = "auto_check"


def is_player_question(message) -> bool:
    """A message the player typed (not the check's automatic feedback)."""
    return isinstance(message, HumanMessage) and message.name != CHECK_FEEDBACK


def current_turn(messages: list) -> list:
    """The messages since the player's latest question (that question included)."""
    starts = [i for i, message in enumerate(messages) if is_player_question(message)]
    return messages[starts[-1] :] if starts else messages


# What each game_length answer means in hours to beat (None = no limit on that side).
# The check node enforces it with the real hours from search_games.
GAME_LENGTH_HOURS: dict[str, tuple[float | None, float | None]] = {
    "short": (None, 10),
    "medium": (10, 30),
    "long": (30, None),
}
GAME_LENGTH_TEXT = {
    "short": "short (under 10h)",
    "medium": "medium (10-30h)",
    "long": "long (over 30h)",
}


def fits_length(hours: float, lengths: list[str]) -> bool:
    """Does a game this long fit ANY of the lengths the player picked? (none picked = anything goes)

    fits_length(5, ["short", "long"]) → True   ·   fits_length(20, ["short", "long"]) → False
    """
    if not lengths:
        return True
    for length in lengths:
        low, high = GAME_LENGTH_HOURS[length]
        if (low is None or hours >= low) and (high is None or hours <= high):
            return True
    return False


class RejectedGame(TypedDict):
    """A game the player said "Not for me" to."""

    game_id: int
    title: str


def add_rejected(
    saved: list[RejectedGame] | None, new: list[RejectedGame] | None
) -> list[RejectedGame]:
    """Reducer for `rejected`: new rejections are ADDED to the saved ones (each game once).

    LangGraph calls this whenever a node or the input writes `rejected`, so a
    turn only needs to send the newly rejected game, never the whole list.
    """
    merged = list(saved or [])
    known = {game["game_id"] for game in merged}
    for game in new or []:
        if game["game_id"] not in known:
            merged.append(game)
            known.add(game["game_id"])
    return merged


class RecommenderState(MessagesState):
    preferences: Preferences  # the player's answers, set once at the start
    recommendations: Recommendations | None  # the final cards (set by the format node)
    check_problems: list[str]  # what the last check found wrong (empty = passed)
    fix_attempts: int  # how many times the agent was sent back to fix its answer
    started_at: float  # when this answer started (time.time()), for its time budget
    # "Not for me" games: never suggested again in this conversation. Unlike the
    # per-answer fields above, this one is conversation state, so it keeps growing.
    rejected: Annotated[list[RejectedGame], add_rejected]


def new_turn(
    question: str,
    preferences: Preferences | None = None,
    rejected: list[RejectedGame] | None = None,
) -> dict:
    """The input for one new question in a conversation.

    With memory, the whole state carries over between turns. `messages` has a
    reducer that APPENDS, so the new question joins the history. Every other field
    is plain, so whatever we pass here REPLACES the saved value: that's how the
    per-answer fields start fresh each turn instead of leaking from the last one.
    """
    turn: dict = {
        "messages": [HumanMessage(content=question)],
        "recommendations": None,  # this turn's cards don't exist yet
        "check_problems": [],  # nothing has failed a check yet
        "fix_attempts": 0,  # each answer gets its own fix rounds
        "started_at": time.time(),  # each answer gets its own time budget
    }
    if preferences is not None:  # leave out → keep the preferences already saved
        turn["preferences"] = preferences
    if rejected:  # the reducer ADDS these to the ones already rejected
        turn["rejected"] = rejected
    return turn


def not_for_me_turn(game_id: int, title: str) -> dict:
    """The turn sent when the player rejects one card: remember it, and ask for a swap."""
    return new_turn(
        f"Not for me: {title}. Replace it with something else, and keep the other picks if they still fit.",
        rejected=[{"game_id": game_id, "title": title}],
    )
