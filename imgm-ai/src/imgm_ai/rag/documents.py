"""
Review → Document: the text the embedding sees, plus metadata.

One review = one document (reviews are short, so no chunking):
    page_content  the words the embedding sees: title, genres, vibes, verdicts, pros,
                  cons, moments and final words. Language goes here, because
                  embeddings capture meaning.
    metadata      exact facts for filtering and citing: ids, title, rating, author.
                  Numbers go here, because embeddings are bad at numbers.
"""

from langchain_core.documents import Document

from imgm_ai.data.db import load_reviews_for_index
from imgm_ai.moderation import mask_profanity
from imgm_ai.rag.phrases import GOT_GOOD_PHRASES, checklist_verdicts, how_they_played


def readable(key: str) -> str:
    """Stored option keys → words: "rage_inducing" → "rage inducing"."""
    return key.replace("_", " ")


def review_to_text(review: dict) -> str:
    """The words the embedding sees. Empty parts are left out; spoiler moments never go in."""
    genres = ", ".join(review["genres"][:3])
    lines = [
        f"{review['title']} ({genres})" if genres else review["title"],
        f"Rated {review['rating']}/10 by an IMGM player.",
    ]
    if review["vibes"]:
        lines.append(f"Vibes: {', '.join(readable(vibe) for vibe in review['vibes'])}.")
    if verdicts := checklist_verdicts(review):
        lines.append(f"Verdict: {'; '.join(verdicts)}.")
    if review.get("got_good_after") in GOT_GOOD_PHRASES:
        lines.append(
            f"When it gets good: {GOT_GOOD_PHRASES[review['got_good_after']]}."
        )
    if played := how_they_played(review):
        lines.append(f"Played: {', '.join(played)}.")
    if review["pros"]:
        lines.append(f"Pros: {'; '.join(review['pros'])}.")
    if review["cons"]:
        lines.append(f"Cons: {'; '.join(review['cons'])}.")

    # Spoiler moments are left out of the index entirely: what the agent can't
    # find, it can never reveal.
    if not review["has_spoilers"]:
        if review["best_moment"]:
            lines.append(f"Best moment: {review['best_moment']}")
        if review["worst_moment"]:
            lines.append(f"Worst moment: {review['worst_moment']}")

    if review["review_text"]:
        lines.append(f"Final words: {review['review_text']}")
    return "\n".join(lines)


def review_to_document(review: dict) -> Document:
    """One review as a Document: the text to embed + metadata for filtering and citing."""
    return Document(
        id=review["id"],  # same review → replaced on re-index, never duplicated
        page_content=review_to_text(review),
        metadata={
            "review_id": review["id"],
            "game_id": review["game_id"],
            "game_title": review["title"],
            "rating": review["rating"],
            "user_id": review["user_id"],  # for filtering only, never shown
            # Metadata is stored as JSON, which has no date type: datetime → text
            "updated_at": review["updated_at"].isoformat(),
        },
    )


def load_review_documents(ids: list[str] | None = None) -> list[Document]:
    """IMGM reviews as Documents, ready for the vector store: all, or only these ids."""
    return [review_to_document(review) for review in load_reviews_for_index(ids)]


def review_excerpt(document: Document, max_chars: int = 200) -> str:
    """A short piece of evidence from a review: its vibes and the start of its final words,
    with swearing masked."""
    parts = []
    for line in document.page_content.splitlines():
        if line.startswith("Vibes: "):
            parts.append(line)
        elif line.startswith("Final words: "):
            words = line.removeprefix("Final words: ")
            if len(words) > max_chars:
                words = words[:max_chars].rsplit(" ", 1)[0] + "…"
            parts.append(f'"{words}"')
    # Masked before the model sees it, so the agent can never quote swearing
    return mask_profanity(" ".join(parts))
