"""
The RAG command line, from imgm-ai/:
    uv run python -m imgm_ai.rag                      # print the documents
    uv run python -m imgm_ai.rag index                # (re)build the index
    uv run python -m imgm_ai.rag search "your query"  # search it
"""

import sys

from imgm_ai.models.embeddings import embedding_model_name
from imgm_ai.rag.documents import load_review_documents
from imgm_ai.rag.store import find_games_by_reviews, index_reviews, search_reviews

command = sys.argv[1] if len(sys.argv) > 1 else "show"

if command == "index":
    print(f"Indexed {index_reviews()} reviews into reviews__{embedding_model_name()}")

elif command == "search":
    query = " ".join(sys.argv[2:]) or "emotional atmospheric game with great music"
    print(f"Search: {query!r}\n")
    for document, distance in search_reviews(query):
        print(f"{distance:.3f}  {document.metadata['game_title']}")
    print("\nGrouped by game:")
    for game in find_games_by_reviews(query):
        print(
            f"- {game['title']} ({game['matching_reviews']} reviews): {game['excerpt']}"
        )

else:
    documents = load_review_documents()
    print(f"{len(documents)} review documents\n")
    for document in documents:
        print("─" * 60)
        print(document.page_content)
        print("metadata:", document.metadata)
