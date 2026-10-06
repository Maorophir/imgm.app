"""
Embeddings: turn text into vectors (lists of numbers that capture meaning) for RAG.

The embedding model is configured separately from the chat model (llm.py):
    EMBEDDINGS_PROVIDER = ollama (default, nomic-embed-text) | gemini (gemini-embedding-2)

Why separate: stored vectors only work with questions embedded by the SAME model.
Switching the chat model for a test run must never switch the embeddings, or
searches would compare vectors from two different models (an error, or garbage).

Try it from imgm-ai/:
    uv run python -m imgm_ai.models.embeddings
"""

import os

from dotenv import load_dotenv
from langchain_core.embeddings import Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_ollama import OllamaEmbeddings

from imgm_ai.models.llm import gemini_tiers

load_dotenv()

# provider → the model it uses. Also used to name vector collections after their
# model (e.g. "reviews__nomic-embed-text"), so two models' vectors never mix.
EMBEDDING_MODELS = {
    "ollama": "nomic-embed-text",
    "gemini": "gemini-embedding-2",
}


class PrefixedEmbeddings(Embeddings):
    """Adds the task prefixes nomic-embed-text expects, so callers can't forget them.

    nomic was trained to know the difference between a stored text ("search_document: ...")
    and a question ("search_query: ..."); without the prefixes, search quality quietly drops.
    Vector stores call embed_documents when indexing and embed_query when searching,
    so each prefix is applied automatically in the right place.
    """

    def __init__(self, base: Embeddings, document_prefix: str, query_prefix: str):
        self.base = base
        self.document_prefix = document_prefix
        self.query_prefix = query_prefix

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.base.embed_documents([self.document_prefix + t for t in texts])

    def embed_query(self, text: str) -> list[float]:
        return self.base.embed_query(self.query_prefix + text)


def embeddings_provider() -> str:
    """Which embedding provider is configured: "ollama" or "gemini"."""
    provider = os.getenv("EMBEDDINGS_PROVIDER", "ollama")
    if provider not in EMBEDDING_MODELS:
        raise ValueError(
            f"Unknown EMBEDDINGS_PROVIDER {provider!r} (use: {', '.join(EMBEDDING_MODELS)})"
        )
    return provider


def embedding_model_name() -> str:
    """The configured embedding model's name, e.g. "nomic-embed-text"."""
    return EMBEDDING_MODELS[embeddings_provider()]


class FallbackEmbeddings(Embeddings):
    """Tries each client in order (the free key first, then the paid one).

    Safe for embeddings because every client is the SAME model: the vectors are
    identical whichever key produced them, so the index never mixes models.
    """

    def __init__(self, clients: list[Embeddings]):
        self.clients = clients

    def _first_that_works(self, method: str, value):
        for client in self.clients[:-1]:
            try:
                return getattr(client, method)(value)
            except Exception:  # quota or overload: try the next key
                continue
        return getattr(self.clients[-1], method)(value)  # the last one's error is real

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._first_that_works("embed_documents", texts)

    def embed_query(self, text: str) -> list[float]:
        return self._first_that_works("embed_query", text)


def get_embeddings() -> Embeddings:
    """The configured embedding model, ready to use."""
    if embeddings_provider() == "gemini":
        # 768 of its 3,072 possible numbers: a recommended size that keeps storage small.
        # TODO (production): gemini-embedding-2 takes task instructions inside the text
        # instead of a task_type; check the docs for the exact format when we switch.
        return FallbackEmbeddings(
            [
                GoogleGenerativeAIEmbeddings(
                    model=EMBEDDING_MODELS["gemini"],
                    output_dimensionality=768,
                    google_api_key=key,
                )
                for _tier, key, _models in gemini_tiers()
            ]
        )
    return PrefixedEmbeddings(
        OllamaEmbeddings(model=EMBEDDING_MODELS["ollama"]),
        document_prefix="search_document: ",
        query_prefix="search_query: ",
    )


if __name__ == "__main__":
    embeddings = get_embeddings()
    vector = embeddings.embed_query("a cozy farming game")
    print(
        f"Model: {embedding_model_name()} | dimensions: {len(vector)} | first numbers: {vector[:3]}"
    )
