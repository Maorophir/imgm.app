"""
The graph's nodes: the agent (model + tools), the formatter (answer → cards) and
the checker (plain code that enforces the rules a prompt can only ask for).
"""

import re

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END

from imgm_ai.agent.prompts import FORMAT_PROMPT, build_system_prompt
from imgm_ai.agent.schemas import Recommendations
from imgm_ai.agent.state import RecommenderState
from imgm_ai.agent.tools import TOOLS
from imgm_ai.data.db import load_player_game_ids
from imgm_ai.models.llm import get_model

# Created once, and told which tools exist. Without bind_tools the model
# can't ask for them.
model = get_model().bind_tools(TOOLS)

AGENT = "agent"
# Must be exactly "tools": that's the name tools_condition routes to
TOOLS_NODE = "tools"
FORMAT = "format"
CHECK = "check"

GAMES_PER_ANSWER = 5
MAX_FIX_ATTEMPTS = 2  # how many times the agent may be sent back to fix its answer

# The format node needs no tools: it only reshapes the answer into Recommendations
formatter = get_model().with_structured_output(Recommendations)


def call_model(state: RecommenderState) -> dict:
    """The agent node: show the model the rules + the conversation, return its reply.

    The system prompt is added to a temporary list for this call only. It is
    never saved in the state, so the state stays a clean record of the
    conversation and the prompt can change without touching old chats.
    The reply is either an answer or a request for tools (tool_calls).
    """
    system = SystemMessage(content=build_system_prompt(state.get("preferences", {})))
    response = model.invoke([system] + state["messages"])
    return {"messages": [response]}  # just the new message: add_messages appends it


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


def format_answer(state: RecommenderState) -> dict:
    """The format node: the guide's written answer → structured cards (Recommendations).

    A separate, tool-free model call with a compact input: the answer text plus
    the list of verified games to copy ids from.
    """
    answer = state["messages"][-1].text
    verified = "\n".join(verified_games(state["messages"]).values()) or "(none)"
    prompt = FORMAT_PROMPT.format(answer=answer, verified_games=verified)
    return {"recommendations": formatter.invoke([HumanMessage(content=prompt)])}


def check_answer(state: RecommenderState, config: RunnableConfig) -> dict:
    """The check node: plain code that enforces the rules a prompt can only ask for.

    5 different games, each verified by search_games, none already played, and
    exactly one Best Pick. Problems go back to the agent as a message to fix.
    """
    recommendations = state.get("recommendations")
    games = recommendations.games if recommendations else []
    verified = verified_games(state["messages"])
    user_id = config.get("configurable", {}).get("user_id")
    played = set(load_player_game_ids(user_id)) if user_id else set()

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
    if sum(game.best_pick for game in games) != 1:
        problems.append("Mark exactly one game as the Best Pick.")

    attempts = state.get("fix_attempts", 0)
    if problems and attempts < MAX_FIX_ATTEMPTS:
        feedback = HumanMessage(
            content="[Automatic check] Your answer has problems:\n- "
            + "\n- ".join(problems)
            + "\nFix them (verify new games with search_games if needed), then write the full answer again."
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
