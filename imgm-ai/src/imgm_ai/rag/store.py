"""
The vector store: review vectors in pgvector, in the separate `imgm_ai` database
(VECTOR_DATABASE_URL). One collection per embedding model, e.g.
"reviews__nomic-embed-text", so vectors from two models never mix.
"""

import logging
import os
import threading
from functools import lru_cache

import psycopg

from langchain_core.documents import Document
from langchain_postgres import PGVector

from imgm_ai.data.db import load_game_covers, load_review_versions
from imgm_ai.models.embeddings import embedding_model_name, get_embeddings
from imgm_ai.rag.documents import load_review_documents, review_excerpt


def vector_db_url() -> str:
    """VECTOR_DATABASE_URL in the form langchain-postgres needs.

    It connects through SQLAlchemy, which wants the driver in the URL:
    postgresql://...  →  postgresql+psycopg://...
    """
    return os.environ["VECTOR_DATABASE_URL"].replace(
        "postgresql://", "postgresql+psycopg://", 1
    )


_store_lock = threading.Lock()


@lru_cache(maxsize=1)
def _create_review_store() -> PGVector:
    return PGVector(
        embeddings=get_embeddings(),
        collection_name=review_collection_name(),
        connection=vector_db_url(),
        use_jsonb=True,  # metadata as JSONB, so it can be filtered
        # Test connections before use: Neon's sleeping database cuts idle ones
        engine_args={"pool_pre_ping": True},
    )


def get_review_store() -> PGVector:
    """The reviews' vector store, created once and reused (it holds a connection pool).

    The lock matters: the agent can run several review searches in parallel threads,
    and two threads creating the store at the same moment crash it.
    """
    with _store_lock:
        return _create_review_store()


def review_collection_name() -> str:
    """The collection for the configured embedding model, e.g. "reviews__nomic-embed-text"."""
    return f"reviews__{embedding_model_name()}"


def stored_id(review_id: str) -> str:
    """A review's id inside the vector store, e.g. "reviews__nomic-embed-text:cmur1q7…".

    langchain-postgres keeps EVERY collection in one table whose ids must be unique
    across all of them. Bare review ids made a second model's index overwrite the
    first one's rows, so each id carries its collection's name.
    """
    return f"{review_collection_name()}:{review_id}"


def index_reviews() -> int:
    """Rebuild the review index from scratch. Returns how many reviews were indexed.

    A full rebuild is the simplest way to stay in sync: edited reviews are
    re-embedded and deleted reviews disappear. Fine for hundreds of reviews;
    with many thousands we'd switch to updating only what changed.
    """
    store = get_review_store()
    documents = load_review_documents()
    store.delete_collection()
    store.create_collection()
    if documents:
        store.add_documents(
            documents, ids=[stored_id(document.id) for document in documents]
        )
    return len(documents)


# ── Keeping the index in sync with the reviews ───────────
# Express calls index_review() whenever a review is saved or deleted; sync_reviews()
# runs when the service starts and catches anything a notification missed.

log = logging.getLogger("imgm_ai.rag")


def index_review(review_id: str) -> str:
    """Bring one review's entry up to date: re-embed it, or remove it if it was deleted.

    Returns "indexed" or "removed".
    """
    store = get_review_store()
    store.delete(
        ids=[stored_id(review_id)], collection_only=True
    )  # the old version, if any
    documents = load_review_documents(ids=[review_id])
    if not documents:
        return "removed"  # the review no longer exists
    store.add_documents(documents, ids=[stored_id(review_id)])
    return "indexed"


def indexed_versions() -> dict[str, str]:
    """What the index holds: {review id: the updatedAt it was embedded from}."""
    with psycopg.connect(
        os.environ["VECTOR_DATABASE_URL"]
    ) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.cmetadata ->> 'review_id', e.cmetadata ->> 'updated_at'
            FROM langchain_pg_embedding e
            JOIN langchain_pg_collection c ON c.uuid = e.collection_id
            WHERE c.name = %(collection)s
            """,
            {"collection": review_collection_name()},
        )
        return dict(cur.fetchall())


def sync_reviews() -> dict:
    """Fix only what differs between the reviews and the index (cheap when nothing changed).

    New or edited reviews (a different updatedAt) are embedded again, reviews that
    were deleted are removed. Returns {"updated": n, "removed": n}.
    """
    get_review_store()  # makes sure the collection exists before reading it
    in_database = load_review_versions()
    in_index = indexed_versions()
    changed = [
        rid for rid, version in in_database.items() if in_index.get(rid) != version
    ]
    deleted = [rid for rid in in_index if rid not in in_database]

    store = get_review_store()
    if deleted:
        store.delete(ids=[stored_id(rid) for rid in deleted], collection_only=True)
    if changed:
        store.delete(ids=[stored_id(rid) for rid in changed], collection_only=True)
        documents = load_review_documents(ids=changed)
        store.add_documents(documents, ids=[stored_id(d.id) for d in documents])
    if changed or deleted:
        log.info(
            "Review index synced: %d updated, %d removed", len(changed), len(deleted)
        )
    return {"updated": len(changed), "removed": len(deleted)}


def search_reviews(
    query: str, k: int = 5, exclude_game_ids: list[int] | None = None
) -> list[tuple[Document, float]]:
    """The k reviews closest in meaning to the query, as (document, distance) pairs.

    Distance is cosine distance: 0 = same meaning, higher = less related.
    exclude_game_ids leaves out reviews of those games (a metadata filter), e.g. the
    games the player already played. That also leaves out the player's own reviews.
    """
    search_filter = (
        {"game_id": {"$nin": exclude_game_ids}} if exclude_game_ids else None
    )
    return get_review_store().similarity_search_with_score(
        query, k=k, filter=search_filter
    )


def find_games_by_reviews(
    query: str, exclude_game_ids: list[int] | None = None, max_games: int = 5
) -> list[dict]:
    """Games whose IMGM reviews match the query in meaning, closest first.

    Searches 15 reviews, then groups them by game (several reviews of the same
    game count once), keeping each game's closest review as evidence.
    [{"game_id", "title", "cover", "matching_reviews", "ratings": [9, 10], "excerpt"}, ...]
    """
    games: dict[int, dict] = {}
    for document, _distance in search_reviews(
        query, k=15, exclude_game_ids=exclude_game_ids
    ):
        meta = document.metadata
        game = games.setdefault(
            meta["game_id"],
            {
                "game_id": meta["game_id"],
                "title": meta["game_title"],
                "matching_reviews": 0,
                "ratings": [],
                "excerpt": review_excerpt(
                    document
                ),  # the closest review (hits come closest first)
            },
        )
        game["matching_reviews"] += 1
        game["ratings"].append(meta["rating"])
    # dicts keep insertion order: closest game first
    found = list(games.values())[:max_games]
    covers = load_game_covers([game["game_id"] for game in found])
    for game in found:
        game["cover"] = covers.get(game["game_id"])
    return found
