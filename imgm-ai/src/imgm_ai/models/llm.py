"""
The chat model: Ollama locally, Gemini on the live site (LLM_PROVIDER=gemini).

Gemini sometimes answers 503 "high demand" (or 429 when a free-tier quota runs
out). So Gemini is a chain: if a model still fails after its retry, the next one
answers. Each model has its own capacity and quota, so a busy one rarely takes
the others down with it.
"""

import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama

load_dotenv()

OLLAMA_MODEL = "gemma4:e4b"

# Strongest first; each one is only used if the ones before it failed
GEMINI_MODELS = [
    "gemini-3.8-flash",  # main
    "gemini-3.7-flash",  # same family, previous version
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",  # last resort: fast but weaker, still better than an error
]


def model_names() -> list[str]:
    """The models in use, in order (main model first)."""
    return GEMINI_MODELS if os.environ.get("LLM_PROVIDER") == "gemini" else [OLLAMA_MODEL]


def make_model(name: str):
    """One chat model by name."""
    if os.environ.get("LLM_PROVIDER") == "gemini":
        # One retry, then fall through to the next model (faster than many retries)
        return ChatGoogleGenerativeAI(model=name, thinking_level="low", timeout=60, max_retries=1)
    return ChatOllama(model=name, num_ctx=32768)  # 32K fits both 8 GB GPUs (measured)


def get_model(prepare=None):
    """The model, ready for one job, with fallbacks on Gemini.

    `prepare` adapts every model in the chain the same way, e.g.
    `lambda m: m.bind_tools(TOOLS)`. It has to happen to each model BEFORE they are
    chained: a fallback chain has no bind_tools / with_structured_output of its own.
    """
    prepare = prepare or (lambda m: m)
    models = [prepare(make_model(name)) for name in model_names()]
    return models[0].with_fallbacks(models[1:]) if len(models) > 1 else models[0]


if __name__ == "__main__":
    print("models:", model_names())
    print(get_model().invoke("Hi from IMGM, the game review site!").content)
