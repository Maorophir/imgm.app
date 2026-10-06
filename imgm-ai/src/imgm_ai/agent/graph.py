"""
IMGM recommendation agent: how the nodes connect.

    START → agent ⇄ tools               the reasoning loop: think, use tools, look again
              │ answer written
              ▼
            format → check ──passes──► END
              ▲        │ problems (at most MAX_FIX_ATTEMPTS times)
              └ agent ◄┘

State (state.py): messages, preferences, recommendations, check_problems, fix_attempts.
"""

from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from imgm_ai.agent.memory import make_checkpointer
from imgm_ai.agent.nodes import (
    AGENT,
    CHECK,
    FORMAT,
    TOOLS_NODE,
    call_model,
    check_answer,
    format_answer,
    route_after_check,
)
from imgm_ai.agent.state import RecommenderState
from imgm_ai.agent.tools import TOOLS

builder = StateGraph(RecommenderState)

builder.add_node(AGENT, call_model)
# ToolNode runs every requested tool and returns their ToolMessages
builder.add_node(TOOLS_NODE, ToolNode(TOOLS))
builder.add_node(FORMAT, format_answer)
builder.add_node(CHECK, check_answer)

builder.add_edge(START, AGENT)
# Tool calls? → "tools". A finished answer → "format" (instead of END)
builder.add_conditional_edges(
    AGENT, tools_condition, {"tools": TOOLS_NODE, END: FORMAT}
)
builder.add_edge(TOOLS_NODE, AGENT)  # the loop: after the tools, the agent looks again
builder.add_edge(FORMAT, CHECK)
builder.add_conditional_edges(CHECK, route_after_check, [AGENT, END])

# Memory: the checkpointer saves the state after every step, per thread_id (memory.py)
graph = builder.compile(checkpointer=make_checkpointer())
