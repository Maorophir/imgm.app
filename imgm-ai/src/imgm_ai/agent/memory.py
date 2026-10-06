"""
Chat memory: where the checkpointer saves conversations.

Chats are saved in the AI service's own database (imgm_ai, VECTOR_DATABASE_URL, next
to the RAG vectors), so they survive restarts. Each chat is a "thread", filed under
"<user id>:<chat id>" by server.py. CHECKPOINTER=memory keeps them in RAM instead,
for quick experiments.
"""

import atexit
import os

from dotenv import load_dotenv
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

load_dotenv()

# Rebuilding classes from saved data is a classic attack route, so only our own
# result type is allowed back in (LangGraph's built-in types, like messages, always are).
serde = JsonPlusSerializer(
    allowed_msgpack_modules=[("imgm_ai.agent.schemas", "Recommendations")]
)


def make_checkpointer() -> PostgresSaver | InMemorySaver:
    """The checkpointer the graph saves chats with: Postgres, or RAM if asked."""
    if os.getenv("CHECKPOINTER") == "memory":
        return InMemorySaver(serde=serde)

    # A pool, not one connection: the web server runs several chats at the same time.
    # These connection settings are the ones LangGraph's PostgresSaver requires.
    pool = ConnectionPool(
        os.environ["VECTOR_DATABASE_URL"],
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
        max_size=5,
        open=True,
    )
    atexit.register(pool.close)
    saver = PostgresSaver(pool, serde=serde)
    saver.setup()  # creates the checkpoint tables the first time; safe to repeat
    return saver
