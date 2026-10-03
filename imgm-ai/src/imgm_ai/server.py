"""
The IMGM AI web service: streams the Game Guide's work to the website, live.

Only Express calls this service. Express checks the login and passes the player's
id in X-User-Id, together with the shared secret INTERNAL_API_KEY in X-Internal-Key.
The browser never talks to it directly, so it can never choose whose data is used.

Run from imgm-ai/:
    uv run uvicorn imgm_ai.server:app --port 8000 --reload

POST /guide/stream answers with Server-Sent Events (SSE), in this order:
    start                        the run began
    step     {id, state, label, detail}   a timeline entry: "running", then "done"
    games    {source, query, games}       games the agent is considering (side panel)
    token    {message_id, text}           the answer streaming in, word by word
    cards    {intro, games, follow_up}    the final 5 picks, ready to show
    done     {problems}                   the run finished
    error    {message}                    something broke
"""

import json
import logging
import os
import secrets

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessageChunk, HumanMessage
from pydantic import BaseModel, Field

from imgm_ai.agent.graph import graph
from imgm_ai.agent.state import Preferences
from imgm_ai.models.llm import get_model

log = logging.getLogger("imgm_ai.server")
app = FastAPI(title="IMGM AI")


class GuideRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    preferences: Preferences = Field(default_factory=dict)


def check_internal_key(key: str | None) -> None:
    """Only Express (which knows INTERNAL_API_KEY) may call this service.

    Locally, without a key in .env, the check is skipped. Production must set one.
    """
    expected = os.getenv("INTERNAL_API_KEY")
    if expected and not secrets.compare_digest(key or "", expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Turning the graph's activity into timeline steps ─────


def step_label(call: dict) -> str:
    """A tool call as a friendly "running" line for the timeline."""
    query = call["args"].get("query", "")
    return {
        "get_my_taste": "Reading your IMGM reviews",
        "search_imgm_reviews": f"Asking IMGM players about “{query}”",
        "search_games": f"Checking {query}",
        "get_game_profile": "Reading what IMGM players think",
    }.get(call["name"], "Working")


def step_detail(tool: str, result: str) -> str:
    """A tool's result as a short "done" line: "5 games match", "Found Hades (2020)"."""
    hits = [line for line in result.splitlines() if line.startswith("- ")]
    if tool == "get_my_taste":
        return f"Read {len(hits)} of your reviews" if hits else "No reviews to read yet"
    if tool == "search_imgm_reviews":
        return f"{len(hits)} games match" if hits else "No matching reviews yet"
    if tool == "search_games":
        if not hits:
            return "Not found"
        # "- [id 113112] Hades (2020) · Supergiant ..." → "Found Hades (2020)"
        return "Found " + hits[0].split("] ", 1)[1].split(" · ")[0]
    return result.splitlines()[0] if result else "Done"


def sse(event: str, data: dict) -> str:
    """One Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


# ── The stream ───────────────────────────────────────────


def guide_events(request: GuideRequest, user_id: str | None):
    """Run the agent and yield its work as SSE events, as it happens."""
    config = {"configurable": {"user_id": user_id}, "recursion_limit": 40}
    inputs = {
        "messages": [HumanMessage(content=request.message)],
        "preferences": request.preferences,
    }

    tools_by_call = {}  # tool_call_id → tool name, to label the "done" step
    games = {}  # game id → tile info (cover, platforms, rating), for the final cards
    recommendations, problems, rounds = None, [], 0

    yield sse("start", {})
    try:
        for mode, chunk in graph.stream(
            inputs, config, stream_mode=["updates", "custom", "messages"]
        ):
            # Games the tools found: remember them, show them in the side panel
            if mode == "custom" and chunk.get("type") == "games":
                for tile in chunk["games"]:
                    known = games.get(tile["id"], {})
                    games[tile["id"]] = {
                        **known,
                        **{k: v for k, v in tile.items() if v is not None},
                    }
                # A title search returns look-alikes too; only its top result is worth showing
                shown = (
                    chunk["games"][:1]
                    if chunk["source"] == "catalog"
                    else chunk["games"]
                )
                yield sse(
                    "games",
                    {
                        "source": chunk["source"],
                        "query": chunk["query"],
                        "games": shown,
                    },
                )

            # The agent's answer, token by token (not the formatter's, not tool calls)
            elif mode == "messages":
                message, meta = chunk
                if (
                    meta.get("langgraph_node") == "agent"
                    and isinstance(message, AIMessageChunk)
                    and not message.tool_call_chunks
                    and message.text
                ):
                    yield sse("token", {"message_id": message.id, "text": message.text})

            # Each node finishing: the timeline
            elif mode == "updates":
                for node, update in chunk.items():
                    if node == "agent":
                        reply = update["messages"][-1]
                        for call in reply.tool_calls:
                            tools_by_call[call["id"]] = call["name"]
                            yield sse(
                                "step",
                                {
                                    "id": call["id"],
                                    "state": "running",
                                    "label": step_label(call),
                                },
                            )
                        if (
                            not reply.tool_calls
                        ):  # answer written → it goes to the formatter
                            rounds += 1
                            yield sse(
                                "step",
                                {
                                    "id": f"format-{rounds}",
                                    "state": "running",
                                    "label": "Putting your 5 picks together",
                                },
                            )
                    elif node == "tools":
                        for result in update["messages"]:
                            tool = tools_by_call.get(result.tool_call_id, result.name)
                            yield sse(
                                "step",
                                {
                                    "id": result.tool_call_id,
                                    "state": "done",
                                    "detail": step_detail(tool, result.text),
                                },
                            )
                    elif node == "format":
                        recommendations = update["recommendations"]
                        yield sse(
                            "step",
                            {
                                "id": f"format-{rounds}",
                                "state": "done",
                                "detail": "Picks ready",
                            },
                        )
                        yield sse(
                            "step",
                            {
                                "id": f"check-{rounds}",
                                "state": "running",
                                "label": "Double-checking every pick",
                            },
                        )
                    elif node == "check":
                        problems = update.get("check_problems", [])
                        fixing = bool(problems) and "messages" in update
                        detail = (
                            f"Fixing {len(problems)} issue(s)"
                            if fixing
                            else "All picks verified"
                        )
                        yield sse(
                            "step",
                            {
                                "id": f"check-{rounds}",
                                "state": "done",
                                "detail": detail,
                            },
                        )

        if recommendations:
            cards = [
                {**games.get(card.game_id, {}), **card.model_dump()}
                for card in recommendations.games
            ]
            yield sse(
                "cards",
                {
                    "intro": recommendations.intro,
                    "games": cards,
                    "follow_up": recommendations.follow_up,
                },
            )
        yield sse("done", {"problems": problems})
    except Exception:
        log.exception("Game Guide run failed")
        yield sse(
            "error", {"message": "The guide ran into a problem. Please try again."}
        )


# ── Routes ───────────────────────────────────────────────


@app.get("/health")
def health() -> dict:
    """For uptime checks."""
    return {"ok": True, "model": getattr(get_model(), "model", "?")}


@app.post("/guide/stream")
def guide_stream(
    request: GuideRequest,
    x_user_id: str | None = Header(default=None),
    x_internal_key: str | None = Header(default=None),
) -> StreamingResponse:
    """Run the Game Guide for one message and stream its work (see the module docstring)."""
    check_internal_key(x_internal_key)
    return StreamingResponse(
        guide_events(request, x_user_id),
        media_type="text/event-stream",
        # No caching or proxy buffering: each event must reach the browser immediately
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
