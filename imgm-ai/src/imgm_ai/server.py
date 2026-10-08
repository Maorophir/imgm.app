"""
The IMGM AI web service: streams Play Next's work to the website, live.

Only Express calls this service. Express checks the login and passes the player's
id in X-User-Id, together with the shared secret INTERNAL_API_KEY in X-Internal-Key.
The browser never talks to it directly, so it can never choose whose data is used.

Conversations: the page sends a chat_id (a random id it made). The saved chat is
filed under "<user id>:<chat_id>", and the user id comes from Express (the login),
so a player can only ever reach their own chats, even with someone else's chat_id.

Run from imgm-ai/:
    uv run uvicorn imgm_ai.server:app --port 8000 --reload

POST /guide/stream answers with Server-Sent Events (SSE), in this order:
    start                        the run began
    step     {id, state, label, detail}   a timeline entry: "running", then "done"
    games    {source, query, games}       games the agent is considering (side panel)
    token    {message_id, text}           the answer streaming in, word by word
    cards    {intro, games, follow_up}    the final 5 picks, ready to show
    done     {problems}                   the run finished
    error    {message, code?}             something broke (code "chat_full": start a new chat)
"""

import json
import logging
import os
import re
import secrets
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessageChunk
from pydantic import BaseModel, Field, model_validator

from imgm_ai.agent.graph import graph
from imgm_ai.agent.memory import delete_old_chats
from imgm_ai.agent.nodes import is_player_question
from imgm_ai.agent.state import Preferences, new_turn, not_for_me_turn
from imgm_ai.data import imgm_api
from imgm_ai.models.llm import model_names
from imgm_ai.rag.store import index_review, sync_reviews

log = logging.getLogger("imgm_ai.server")
# Our own info/warning lines (model skips, catch-ups) show up in Cloud Run's logs
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

# Cloud Run sets K_SERVICE; APP_ENV=production works anywhere else
IS_PRODUCTION = bool(os.getenv("K_SERVICE")) or os.getenv("APP_ENV") == "production"
if IS_PRODUCTION and not os.getenv("INTERNAL_API_KEY"):
    # Without it, anyone who finds this service's address could run (and bill) the agent
    raise RuntimeError("INTERNAL_API_KEY must be set in production")


@asynccontextmanager
async def lifespan(_app):
    """On startup, in the background (startup isn't delayed):
    - catch up the review index (reviews saved or deleted while this service slept)
    - delete chats untouched for 30 days (keeps the database small)
    """

    def catch_up():
        try:
            log.info("Review index catch-up: %s", sync_reviews())
        except Exception:
            log.exception("Review index catch-up failed")
        try:
            delete_old_chats(graph.checkpointer)
        except Exception:
            log.exception("Old chat cleanup failed")

    threading.Thread(target=catch_up, daemon=True).start()
    yield


app = FastAPI(title="IMGM AI", lifespan=lifespan)


MAX_QUESTIONS_PER_CHAT = 20  # then the player starts a new chat (keeps memory bounded)


class NotForMe(BaseModel):
    """The player rejected one card."""

    game_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=200)


class GuideRequest(BaseModel):
    chat_id: str = Field(
        pattern=r"^[A-Za-z0-9-]{8,64}$"
    )  # made by the page, one per chat
    message: str | None = Field(default=None, min_length=1, max_length=1000)
    not_for_me: NotForMe | None = None
    preferences: Preferences = Field(default_factory=dict)

    @model_validator(mode="after")
    def needs_a_message_or_a_rejection(self) -> "GuideRequest":
        if not self.message and not self.not_for_me:
            raise ValueError("Send a message or a 'not for me'.")
        return self


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
        "search_web": f"Searching the web for “{query}”",
    }.get(call["name"], "Working")


def step_detail(tool: str, result: str) -> str:
    """A tool's result as a short "done" line: "5 games match", "Found Hades (2020)"."""
    hits = [line for line in result.splitlines() if line.startswith("- ")]
    if tool == "get_my_taste":
        return f"Read {len(hits)} of your reviews" if hits else "No reviews to read yet"
    if tool == "search_imgm_reviews":
        return f"{len(hits)} games match" if hits else "No matching reviews yet"
    if tool == "search_web":
        if "limit reached" in result:
            return "Web search limit reached"
        return f"Read {len(hits)} pages" if hits else "Nothing useful found"
    if tool == "search_games":
        if not hits:
            return "Not found"
        # "- [id 113112] Hades (2020) · Supergiant ..." → "Found Hades (2020)"
        return "Found " + hits[0].split("] ", 1)[1].split(" · ")[0]
    return result.splitlines()[0] if result else "Done"


def game_tile_from_imgm(game_id: int) -> dict:
    """Cover, year, platforms and IMGM rating for a card, from Express ({} if unavailable)."""
    try:
        game = imgm_api.get_game(game_id)
    except Exception:
        log.warning("Couldn't load game %s for its card", game_id)
        return {}
    if not game:
        return {}
    rating = (game.get("ratings") or {}).get("imgm")
    return {
        "cover": game.get("coverUrl"),
        "year": (game.get("releaseDate") or "")[:4] or None,
        "platforms": game.get("platforms", []),
        "rating": rating,
        "review_count": len(game.get("reviews", [])),
    }


def sse(event: str, data: dict) -> str:
    """One Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


# ── The stream ───────────────────────────────────────────


def guide_events(request: GuideRequest, user_id: str | None):
    """Run the agent and yield its work as SSE events, as it happens."""
    # The saved chat is filed under the logged-in player's id + the page's chat id,
    # so nobody can load another player's conversation (see the module docstring)
    config = {
        "configurable": {
            "user_id": user_id,
            "thread_id": f"{user_id or 'guest'}:{request.chat_id}",
        },
        "recursion_limit": 40,
    }

    # Long chats are cut off: memory and context stay bounded
    saved = graph.get_state(config).values.get("messages", [])
    if sum(is_player_question(m) for m in saved) >= MAX_QUESTIONS_PER_CHAT:
        yield sse("start", {})
        yield sse(
            "error",
            {
                "message": f"This chat is full ({MAX_QUESTIONS_PER_CHAT} questions). Start a new chat to keep going.",
                "code": "chat_full",
            },
        )
        return

    if request.not_for_me:
        inputs = not_for_me_turn(request.not_for_me.game_id, request.not_for_me.title)
        inputs["preferences"] = request.preferences
    else:
        inputs = new_turn(request.message, request.preferences)

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
            # A card kept from an earlier turn has no tile from this run: look it up
            for card in recommendations.games:
                if not games.get(card.game_id, {}).get("cover"):
                    games[card.game_id] = {
                        **game_tile_from_imgm(card.game_id),
                        **games.get(card.game_id, {}),
                    }
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
        log.exception("Play Next run failed")
        yield sse(
            "error", {"message": "Play Next ran into a problem. Please try again."}
        )


# ── Routes ───────────────────────────────────────────────


@app.get("/health")
def health() -> dict:
    """For uptime checks."""
    main, *fallbacks = model_names()
    return {"ok": True, "model": main, "fallbacks": fallbacks}


@app.post("/guide/stream")
def guide_stream(
    request: GuideRequest,
    x_user_id: str | None = Header(default=None),
    x_internal_key: str | None = Header(default=None),
) -> StreamingResponse:
    """Run Play Next for one message and stream its work (see the module docstring)."""
    check_internal_key(x_internal_key)
    return StreamingResponse(
        guide_events(request, x_user_id),
        media_type="text/event-stream",
        # No caching or proxy buffering: each event must reach the browser immediately
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Review index (called by Express, never by browsers) ──

REVIEW_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


@app.post("/index/reviews/{review_id}")
def reindex_review(
    review_id: str, x_internal_key: str | None = Header(default=None)
) -> dict:
    """A review was saved or deleted: update its entry in the search index."""
    check_internal_key(x_internal_key)
    if not REVIEW_ID.match(review_id):
        raise HTTPException(status_code=400, detail="Invalid review id")
    return {"review_id": review_id, "result": index_review(review_id)}


@app.post("/index/sync")
def resync_reviews(x_internal_key: str | None = Header(default=None)) -> dict:
    """Catch the whole index up with the reviews (e.g. after seeding)."""
    check_internal_key(x_internal_key)
    return sync_reviews()
