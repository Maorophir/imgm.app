"""
IMGM AI: the game recommendation agent behind imgm.app.

    agent/       the LangGraph agent: state, prompts, tools, nodes, graph
    rag/         IMGM reviews made searchable by meaning (pgvector)
    data/        IMGM's data: Postgres (read-only) and the Express API
    models/      the chat and embedding models, chosen by .env
    moderation.py  masks swearing in quotes the agent sees

Talk to the agent:  uv run python -m imgm_ai "your question"
"""
