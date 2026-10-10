"""
The chat model: Ollama locally, Gemini on the live site (LLM_PROVIDER=gemini).

Gemini runs as a chain of fallbacks, cheapest first. A model is only used if every
model before it failed:
    1. The FREE key (GEMINI_DEV_API_KEY in development, else GEMINI_FREE_API_KEY):  four Flash models, then two Flash-Lite
    2. VERTEX AI (VERTEX_PROJECT, optional):                  Google Cloud's Gemini, billed to the
                                                              project's billing account (its $300
                                                              free credit until Jan 5, 2027)
    3. The PAID key (GEMINI_PAID_API_KEY, optional):          AI Studio prepay, the last resort
So normal days cost nothing, and the paid key only answers when the free quota is
used up (429) or Google is overloaded (503).

A model that fails is SKIPPED for a while, so the next calls don't trip over it again
(one answer makes ~6 calls; without skipping, each one would retry the same busy model):
    out of quota (429)  → skipped for as long as Google says (its retryDelay):
                          ~a minute for a per-minute limit, hours for a daily one
    timed out           → skipped for 15 minutes: Google holds a free request without
                          answering, often as the daily quota runs out
    overloaded (503)    → skipped for 2 minutes (usually brief)
Free models also give up sooner (FREE_TIMEOUT): there's always another model to try.
When a failure cost real time, the page is told ("switched to a backup model").

AI Studio (free + paid keys) and Vertex are separate systems. Gemini 3 signs every
tool call it makes (a "thought signature") and expects it back, but each system
rejects the other's signatures (400 "Invalid thought signature"). So each answer is
marked with the system that wrote it, and a call to the other system gets those
signatures removed; LangChain then sends Google's documented skip-the-check value.
"""

import logging
import os
import re
import time

from dotenv import load_dotenv
from langchain_core.messages import AIMessage
from langchain_core.prompt_values import PromptValue
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama

from imgm_ai.agent.events import emit

load_dotenv()
log = logging.getLogger("imgm_ai.models")

# The local model, set per machine in .env (both have 8 GB GPUs; see two-machines notes)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL") or "gemma4:e4b"  # empty in .env = the default
# Thinking models (Qwen) think before every call: smarter, much slower. "off" skips it.
OLLAMA_THINK = os.getenv("OLLAMA_THINK", "").strip().lower()

# Free tier: every model has its OWN free quota, so each one is extra free capacity.
# Stable versions only (no previews or "-latest" aliases, which can change underneath
# us). Free limits per model (AI Studio, 2026-10-08):
#   3.8 / 3.6 / 3.5 Flash         5 per minute, 20 per day   (~3 answers a day each)
#   3.5 / 3.1 Flash-Lite          15 per minute, 500 per day (~80 answers a day each)
# The big Flash models go first (strongest), and once their daily 20 are used up they
# are skipped until Google's reset, so the Lite models carry most of the free load.
FREE_TIER_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
]

# Paid tier: strongest first; each one only answers if the ones before it failed.
# Prices per 1M tokens (in / out, thinking counts as out), checked 2026-10-08:
#   3.8 / 3.6 Flash        $0.75 / $3.75 until Dec 31, 2026, then $1.50 / $7.50
#   3.5 Flash-Lite         $0.30 / $2.50
# 3.5 Flash is left out of the paid chain: older AND pricier ($1.50 / $9.00) than 3.8.
# 3.7 Flash is gone (2026-10, deprecated): Google sends its calls to 3.8, so as a backup
# it would only repeat 3.8's failure.
PAID_TIER_MODELS = [
    "gemini-3.8-flash",  # main
    "gemini-3.6-flash",  # same family, previous version
    "gemini-3.5-flash-lite",  # last resort: cheap and fast, still better than an error
]

# Vertex AI: the same models through Google Cloud. No API key: it signs in as the
# Cloud Run service (locally: `gcloud auth application-default login`).
VERTEX_MODELS = PAID_TIER_MODELS

QUOTA_COOLDOWN = 60 * 60  # 429 without a retry time from Google: skip for an hour
MAX_QUOTA_COOLDOWN = 24 * 60 * 60  # never skip longer than a day
BUSY_COOLDOWN = 2 * 60  # seconds a model is skipped after an overload (503)
TIMEOUT_COOLDOWN = (
    15 * 60
)  # ...and after a timeout: a stalled model tends to stay stalled
# Seconds a free model gets before we move on (paid models get 60). Normal free calls
# take 2-5s and 95% finish within 20s; the rest took 40s+, slower than the next model.
FREE_TIMEOUT = 20
SLOW_FAILURE = (
    3  # seconds: a failure slower than this is worth telling the player about
)

# "free:gemini-3.8-flash" → when it may be tried again
_skip_until: dict[str, float] = {}


class ModelCoolingDown(Exception):
    """Raised instead of calling a model that failed recently (see the cooldowns)."""


def uses_gemini() -> bool:
    return (
        os.environ.get("LLM_PROVIDER", "").strip().strip("\"'") == "gemini"
    )  # tolerate pasted quotes


def gemini_tiers() -> list[tuple[str, str, list[str]]]:
    """The Gemini keys in the order they're tried: [(tier, api_key, models), ...].

    The free key is, in this order:
      GEMINI_DEV_API_KEY   a separate free project for development, so testing never
                           uses up the players' daily free quota (never set in production)
      GEMINI_FREE_API_KEY  the production free key
      GOOGLE_API_KEY       older .env files
    """
    free_key = os.getenv("GEMINI_DEV_API_KEY") or os.getenv("GEMINI_FREE_API_KEY")
    paid_key = os.getenv("GEMINI_PAID_API_KEY")
    tiers = []
    if free_key:
        tiers.append(("free", free_key, FREE_TIER_MODELS))
    if os.getenv("VERTEX_PROJECT"):
        tiers.append(("vertex", None, VERTEX_MODELS))  # signs in without a key
    if paid_key:
        tiers.append(("paid", paid_key, PAID_TIER_MODELS))
    if not tiers:
        raise RuntimeError(
            "No Gemini access: set GEMINI_FREE_API_KEY, VERTEX_PROJECT and/or GEMINI_PAID_API_KEY"
        )
    return tiers


def model_names() -> list[str]:
    """The models in use, in the order they're tried, e.g. "free:gemini-3.8-flash"."""
    if not uses_gemini():
        return [OLLAMA_MODEL]
    return [f"{tier}:{name}" for tier, _key, names in gemini_tiers() for name in names]


def cooldown_for(error: Exception) -> int:
    """How long to skip a model after this error, in seconds (0 = don't skip)."""
    text = str(error)
    if "429" in text or "RESOURCE_EXHAUSTED" in text or "quota" in text.lower():
        # Google says how long to wait: seconds for a per-minute limit, hours for the
        # free tier's daily one ("retryDelay": "37684s")
        wait = re.search(
            r"retryDelay['\"]?\s*:\s*['\"]?(\d+(?:\.\d+)?)s", text
        ) or re.search(r"retry in (\d+(?:\.\d+)?)s", text)
        if wait:
            return min(max(int(float(wait.group(1))) + 1, 10), MAX_QUOTA_COOLDOWN)
        return QUOTA_COOLDOWN
    if (
        "timed out" in text.lower()
        or "timeout" in type(error).__name__.lower()
        or "504" in text
        or "DEADLINE_EXCEEDED" in text
    ):
        return TIMEOUT_COOLDOWN
    if any(
        word in text for word in ("503", "UNAVAILABLE", "overloaded", "high demand")
    ):
        return BUSY_COOLDOWN
    return 0  # e.g. a bad request: skipping the model wouldn't help


SIGNATURES_KEY = (
    "__gemini_function_call_thought_signatures__"  # where LangChain keeps them
)
_SIGNATURE_FIELDS = ("thought_signature", "signature")


def backend_of(label: str) -> str:
    """Which Google system a model runs on: "vertex", or "aistudio" (free and paid keys)."""
    return "vertex" if label.startswith("vertex:") else "aistudio"


def without_thought_signatures(message):
    """The message without Gemini's thought signatures (other messages unchanged)."""
    if not isinstance(message, AIMessage):
        return message
    content = message.content
    if isinstance(content, list):
        content = [
            (
                {k: v for k, v in block.items() if k not in _SIGNATURE_FIELDS}
                | (
                    {
                        "extras": {
                            k: v for k, v in block["extras"].items() if k != "signature"
                        }
                    }
                    if isinstance(block.get("extras"), dict)
                    else {}
                )
                if isinstance(block, dict)
                else block
            )
            for block in content
        ]
    extra = {k: v for k, v in message.additional_kwargs.items() if k != SIGNATURES_KEY}
    return message.model_copy(update={"content": content, "additional_kwargs": extra})


def for_backend(model_input, backend: str):
    """The conversation as `backend` accepts it: signatures from the other system removed."""
    if isinstance(model_input, PromptValue):
        model_input = model_input.to_messages()
    if not isinstance(model_input, list):
        return model_input  # a plain string: nothing signed
    return [
        (
            message
            if not isinstance(message, AIMessage)
            or message.response_metadata.get("imgm_backend") == backend
            else without_thought_signatures(message)
        )
        for message in model_input
    ]


def skip_while_cooling_down(model: Runnable, label: str) -> Runnable:
    """Wraps a model: after it fails, it's skipped for a while (see cooldown_for).

    Skipping means raising ModelCoolingDown at once, which the fallback chain treats
    like any failure and hands the call to the next model.
    """

    def call(model_input, config):
        if time.monotonic() < _skip_until.get(label, 0):
            raise ModelCoolingDown(f"{label} is cooling down")
        started = time.monotonic()
        backend = backend_of(label)
        try:
            result = model.invoke(for_backend(model_input, backend), config)
            if isinstance(
                result, AIMessage
            ):  # remember who wrote it (see the module docstring)
                result.response_metadata["imgm_backend"] = backend
            return result
        except Exception as error:
            if cooldown := cooldown_for(error):
                _skip_until[label] = time.monotonic() + cooldown
                log.warning(
                    "%s failed (%s): skipping it for %ds",
                    label,
                    str(error)[:60],
                    cooldown,
                )
            # The player was kept waiting: say why (a quick 429 isn't worth a line)
            if time.monotonic() - started > SLOW_FAILURE:
                emit({"type": "backup"})
            raise

    return RunnableLambda(call, name=label)


def gemini_access(tier: str, key: str | None) -> dict:
    """How a model signs in: an API key, or (Vertex) the Google Cloud project."""
    if tier == "vertex":
        return {
            "vertexai": True,
            "project": os.environ["VERTEX_PROJECT"],
            "location": os.getenv("VERTEX_LOCATION", "global"),
        }
    return {"google_api_key": key}


def get_model(prepare=None):
    """The model, ready for one job: on Gemini, the whole free → paid fallback chain.

    `prepare` adapts every model in the chain the same way, e.g.
    `lambda m: m.bind_tools(TOOLS)`. It has to happen to each model BEFORE they are
    chained: a fallback chain has no bind_tools / with_structured_output of its own.
    """
    prepare = prepare or (lambda m: m)
    if not uses_gemini():
        thinking = {"reasoning": OLLAMA_THINK != "off"} if OLLAMA_THINK else {}
        return prepare(
            ChatOllama(model=OLLAMA_MODEL, num_ctx=32768, **thinking)
        )  # 32K fits both 8 GB GPUs

    chain = []
    for tier, key, names in gemini_tiers():
        for name in names:
            model = prepare(
                ChatGoogleGenerativeAI(
                    model=name,
                    **gemini_access(tier, key),
                    thinking_level="low",
                    # Free: a shorter wait and no retry, since another model is next.
                    # Paid: the last line of defence, so more patience.
                    timeout=FREE_TIMEOUT if tier == "free" else 60,
                    max_retries=0 if tier == "free" else 1,
                )
            )
            # Tags travel to every trace (LangSmith, cost tests): which tier and model answered
            model = model.with_config(tags=[f"imgm-tier:{tier}", f"imgm-model:{name}"])
            # Every model (free and paid) is skipped for a while after failing
            chain.append(skip_while_cooling_down(model, f"{tier}:{name}"))
    return chain[0].with_fallbacks(chain[1:]) if len(chain) > 1 else chain[0]


if __name__ == "__main__":
    print("models, in order:", model_names())
    print(get_model().invoke("Hi from IMGM, the game review site!").text)
