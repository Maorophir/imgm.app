"""
The graph's nodes: the agent (model + tools), the formatter (answer → cards) and
the checker (plain code that enforces the rules a prompt can only ask for).
"""

import re

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END

from imgm_ai.agent.prompts import FORMAT_PROMPT, build_system_prompt
from imgm_ai.agent.schemas import Recommendations
from imgm_ai.agent.state import (
    CHECK_FEEDBACK,
    GAME_LENGTH_TEXT,
    RecommenderState,
    fits_length,
    is_player_question,
)
from imgm_ai.agent.tools import TOOLS
from imgm_ai.data.db import load_player_game_ids
from imgm_ai.models.llm import get_model

# Created once, and told which tools exist. Without bind_tools the model
# can't ask for them.
model = get_model(lambda m: m.bind_tools(TOOLS))

AGENT = "agent"
# Must be exactly "tools": that's the name tools_condition routes to
TOOLS_NODE = "tools"
FORMAT = "format"
CHECK = "check"

GAMES_PER_ANSWER = 5
MAX_FIX_ATTEMPTS = 2  # how many times the agent may be sent back to fix its answer
MIN_POPULARITY = 10  # IGDB ratings + hype below this = practically unknown

# Which game platforms each Tune it choice can play (backward compatibility)
PLAYS_ON = {
    "PC": {"PC"},
    "PlayStation 5": {"PlayStation 5", "PlayStation 4"},
    "Xbox Series X|S": {"Xbox Series X|S", "Xbox One"},
    "Nintendo Switch": {"Nintendo Switch"},
}

# The format node needs no tools: it only reshapes the answer into Recommendations
formatter = get_model(lambda m: m.with_structured_output(Recommendations))


def call_model(state: RecommenderState) -> dict:
    """The agent node: show the model the rules + the conversation, return its reply.

    The system prompt is added to a temporary list for this call only. It is
    never saved in the state, so the state stays a clean record of the
    conversation and the prompt can change without touching old chats.
    The reply is either an answer or a request for tools (tool_calls).
    """
    system = SystemMessage(
        content=build_system_prompt(
            state.get("preferences", {}), state.get("rejected", [])
        )
    )
    response = model.invoke([system] + model_context(state["messages"]))
    return {"messages": [response]}  # just the new message: add_messages appends it


def model_context(messages: list) -> list:
    """What the agent sees: past turns condensed, the current turn in full.

    The state keeps everything (the checkpointer saves it all), but old tool calls,
    tool results and check feedback are clutter for the next question: they slow
    every model call down and pull a small model off topic. So each past turn is
    shown as just the player's question + the agent's final answer.
    """
    starts = [i for i, message in enumerate(messages) if is_player_question(message)]
    if len(starts) <= 1:
        return messages  # first turn: nothing to condense

    context = []
    for begin, end in zip(starts, starts[1:]):  # every finished turn
        turn = messages[begin:end]
        context.append(turn[0])  # the player's question
        answers = [
            m
            for m in turn
            if isinstance(m, AIMessage) and not m.tool_calls and m.text.strip()
        ]
        if answers:
            context.append(answers[-1])  # the final (possibly fixed) answer
    return context + messages[starts[-1] :]  # the current turn, untouched


def verified_games(messages: list) -> dict[int, str]:
    """Every game search_games returned in this conversation: {id: result line}.

    A game counts as verified only if it appeared in a search_games result.
    """
    games = {}
    for message in messages:
        if isinstance(message, ToolMessage) and message.name == "search_games":
            for line in message.text.splitlines():
                if match := re.match(r"- \[id (\d+)\]", line):
                    games[int(match.group(1))] = line
    return games


def game_hours(search_line: str) -> float | None:
    """The hours to beat in a search_games line ("… about 2.5h to beat …"), or None."""
    match = re.search(r"about ([\d.]+)h to beat", search_line)
    return float(match.group(1)) if match else None


def game_platforms(search_line: str) -> set[str]:
    """The platforms in a search_games line (its 3rd " · " part)."""
    parts = search_line.split(" · ")
    return set(parts[2].split(", ")) if len(parts) > 2 else set()


def plays_on(platforms: set[str], wanted: list[str]) -> bool:
    """Can the player play a game with these platforms on any of theirs?"""
    return any(platforms & PLAYS_ON.get(choice, {choice}) for choice in wanted)


def is_little_known(search_line: str) -> bool:
    """Practically unknown on IGDB: almost no ratings and not hyped."""
    match = re.search(r"· (\d+) IGDB ratings(, hyped)?", search_line)
    if not match:
        return False  # older lines without popularity: don't guess
    return not match.group(2) and int(match.group(1)) < MIN_POPULARITY


def format_answer(state: RecommenderState) -> dict:
    """The format node: the guide's written answer → structured cards (Recommendations).

    A separate, tool-free model call with a compact input: the answer text plus
    the list of verified games to copy ids from.
    """
    answer = state["messages"][-1].text
    verified = "\n".join(verified_games(state["messages"]).values()) or "(none)"
    # What the player asked for in this conversation (e.g. "shorter ones please"),
    # so the formatter can tell the check about a length limit
    requests = "\n".join(
        f"- {m.text}" for m in state["messages"] if is_player_question(m)
    )
    prompt = FORMAT_PROMPT.format(
        answer=answer, verified_games=verified, requests=requests
    )
    return {"recommendations": formatter.invoke([HumanMessage(content=prompt)])}


def check_answer(state: RecommenderState, config: RunnableConfig) -> dict:
    """The check node: plain code that enforces the rules a prompt can only ask for.

    5 different games, each verified by search_games, none already played, none the
    player rejected, none longer than the player asked for (max_hours), all playable on
    the player's platforms, none practically unknown, none graded a weak fit by the
    formatter (first check only), and exactly one Best Pick. Problems go back to the
    agent as a message to fix.
    """
    recommendations = state.get("recommendations")
    games = recommendations.games if recommendations else []
    verified = verified_games(state["messages"])
    user_id = config.get("configurable", {}).get("user_id")
    played = set(load_player_game_ids(user_id)) if user_id else set()
    rejected = {game["game_id"] for game in state.get("rejected", [])}
    lengths = (
        state.get("preferences", {}).get("game_length") or []
    )  # their Tune it picks
    if isinstance(lengths, str):  # chats saved before it became a list
        lengths = [lengths]
    wanted = " or ".join(GAME_LENGTH_TEXT[length] for length in lengths)
    max_hours = recommendations.max_hours if recommendations else None  # "shorter ones"
    wanted_platforms = state.get("preferences", {}).get("platforms") or []
    attempts = state.get("fix_attempts", 0)

    problems = []
    if len(games) != GAMES_PER_ANSWER:
        problems.append(
            f"Recommend exactly {GAMES_PER_ANSWER} games (you gave {len(games)})."
        )
    ids = [game.game_id for game in games]
    if len(set(ids)) != len(ids):
        problems.append("Each game may appear only once.")
    for game in games:
        if game.game_id not in verified:
            problems.append(f"{game.title} was not verified with search_games.")
        if game.game_id in played:
            problems.append(f"The player already reviewed {game.title}: replace it.")
        if game.game_id in rejected:
            problems.append(
                f"The player said 'Not for me' to {game.title}: replace it."
            )
        line = verified.get(game.game_id, "")
        if (
            line
            and wanted_platforms
            and not plays_on(game_platforms(line), wanted_platforms)
        ):
            problems.append(
                f"{game.title} isn't playable on the player's platforms "
                f"({', '.join(wanted_platforms)}): replace it."
            )
        if line and is_little_known(line):
            problems.append(
                f"{game.title} is practically unknown (almost no ratings anywhere): "
                "replace it with a better-known game."
            )
        # The formatter's severe self-grade. Only enforced on the first check, so this
        # judgment costs at most one extra round
        if attempts == 0 and game.fit == "weak":
            problems.append(
                f"{game.title} looks like a weak fit "
                f"({game.fit_note or 'not what the player asked for'}): replace it."
            )
        # Length: the player's limits (their game_length answers, or what they asked
        # for in words), checked against the real hours from search_games
        hours = game_hours(verified.get(game.game_id, ""))
        if hours and not fits_length(hours, lengths):
            problems.append(
                f"{game.title} takes about {hours:g}h to beat, but the player wants "
                f"{wanted} games: replace it with one that fits."
            )
        if hours and max_hours and hours > max_hours:
            problems.append(
                f"{game.title} takes about {hours:g}h to beat, but the player wants games "
                f"under {max_hours:g}h: replace it with a shorter one."
            )
    if sum(game.best_pick for game in games) != 1:
        problems.append("Mark exactly one game as the Best Pick.")

    if problems and attempts < MAX_FIX_ATTEMPTS:
        feedback = HumanMessage(
            name=CHECK_FEEDBACK,
            content="[Automatic check] Your answer has problems:\n- "
            + "\n- ".join(problems)
            + "\nFix them (verify new games with search_games if needed), then write the full answer again.",
        )
        return {
            "messages": [feedback],
            "check_problems": problems,
            "fix_attempts": attempts + 1,
        }
    return {"check_problems": problems}


def route_after_check(state: RecommenderState) -> str:
    """Back to the agent if the check sent feedback; otherwise done."""
    sent_feedback = state.get("check_problems") and isinstance(
        state["messages"][-1], HumanMessage
    )
    return AGENT if sent_feedback else END
