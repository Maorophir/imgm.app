"""
The chat model: Ollama locally, Gemini on the live site (LLM_PROVIDER=gemini).

Gemini runs as a chain of fallbacks, cheapest first. A model is only used if every
model before it failed:
    1. The FREE key (GEMINI_FREE_API_KEY, or GOOGLE_API_KEY):  gemini-3.8-flash → gemini-3.5-flash-lite
    2. The PAID key (GEMINI_PAID_API_KEY, optional):          the full list, strongest first
So normal days cost nothing, and the paid key only answers when the free quota is
used up (429) or Google is overloaded (503).

Once a free model hits its quota it is skipped for an hour (QUOTA_COOLDOWN), so later
calls go straight to the paid key instead of being refused first (a refusal per call,
on every call, would slow every answer down).
"""

import logging
import os
import time

from dotenv import load_dotenv
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama

load_dotenv()
log = logging.getLogger("imgm_ai.models")

OLLAMA_MODEL = "gemma4:e4b"

# Free tier: the two models with the most generous free quotas
FREE_TIER_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"]

# Paid tier: strongest first; each one only answers if the ones before it failed
PAID_TIER_MODELS = [
    "gemini-3.8-flash",  # main
    "gemini-3.7-flash",  # same family, previous version
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",  # last resort: fast but weaker, still better than an error
]

QUOTA_COOLDOWN = 60 * 60  # seconds a free model is skipped after running out of quota
_out_of_quota_until: dict[str, float] = (
    {}
)  # "free:gemini-3.8-flash" → when to try again


class FreeQuotaCooldown(Exception):
    """Raised instead of calling a free model that recently ran out of quota."""


def uses_gemini() -> bool:
    return os.environ.get("LLM_PROVIDER") == "gemini"


def gemini_tiers() -> list[tuple[str, str, list[str]]]:
    """The Gemini keys in the order they're tried: [(tier, api_key, models), ...].

    GOOGLE_API_KEY still counts as the free key, so older .env files keep working.
    """
    free_key = os.getenv("GEMINI_FREE_API_KEY") or os.getenv("GOOGLE_API_KEY")
    paid_key = os.getenv("GEMINI_PAID_API_KEY")
    tiers = []
    if free_key:
        tiers.append(("free", free_key, FREE_TIER_MODELS))
    if paid_key:
        tiers.append(("paid", paid_key, PAID_TIER_MODELS))
    if not tiers:
        raise RuntimeError(
            "No Gemini key: set GEMINI_FREE_API_KEY and/or GEMINI_PAID_API_KEY"
        )
    return tiers


def model_names() -> list[str]:
    """The models in use, in the order they're tried, e.g. "free:gemini-3.8-flash"."""
    if not uses_gemini():
        return [OLLAMA_MODEL]
    return [f"{tier}:{name}" for tier, _key, names in gemini_tiers() for name in names]


def is_quota_error(error: Exception) -> bool:
    """Did Google refuse because a quota ran out (429 / RESOURCE_EXHAUSTED)?"""
    text = str(error)
    return "429" in text or "RESOURCE_EXHAUSTED" in text or "quota" in text.lower()


def skip_when_out_of_quota(model: Runnable, label: str) -> Runnable:
    """Wraps a free-tier model: after a quota refusal, it's skipped for QUOTA_COOLDOWN.

    Skipping means raising FreeQuotaCooldown at once, which the fallback chain treats
    like any failure and hands the call to the next model (soon: the paid key).
    """

    def call(model_input, config):
        if time.monotonic() < _out_of_quota_until.get(label, 0):
            raise FreeQuotaCooldown(f"{label} is out of free quota for now")
        try:
            return model.invoke(model_input, config)
        except Exception as error:
            if is_quota_error(error):
                _out_of_quota_until[label] = time.monotonic() + QUOTA_COOLDOWN
                log.warning("%s is out of free quota: skipping it for an hour", label)
            raise

    return RunnableLambda(call, name=label)


def get_model(prepare=None):
    """The model, ready for one job: on Gemini, the whole free → paid fallback chain.

    `prepare` adapts every model in the chain the same way, e.g.
    `lambda m: m.bind_tools(TOOLS)`. It has to happen to each model BEFORE they are
    chained: a fallback chain has no bind_tools / with_structured_output of its own.
    """
    prepare = prepare or (lambda m: m)
    if not uses_gemini():
        return prepare(
            ChatOllama(model=OLLAMA_MODEL, num_ctx=32768)
        )  # 32K fits both 8 GB GPUs

    chain = []
    for tier, key, names in gemini_tiers():
        for name in names:
            model = prepare(
                ChatGoogleGenerativeAI(
                    model=name,
                    google_api_key=key,
                    thinking_level="low",
                    timeout=60,
                    # Free: no retry, hand over to the next model at once (fast).
                    # Paid: one retry before moving down the list.
                    max_retries=0 if tier == "free" else 1,
                )
            )
            chain.append(
                skip_when_out_of_quota(model, f"{tier}:{name}")
                if tier == "free"
                else model
            )
    return chain[0].with_fallbacks(chain[1:]) if len(chain) > 1 else chain[0]


if __name__ == "__main__":
    print("models, in order:", model_names())
    print(get_model().invoke("Hi from IMGM, the game review site!").text)
