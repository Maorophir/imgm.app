"""
Chat memory: where the checkpointer saves conversations.

Chats are saved in the AI service's own database (imgm_ai, VECTOR_DATABASE_URL, next
to the RAG vectors), so they survive restarts. Each chat is a "thread", filed under
"<user id>:<chat id>" by server.py. CHECKPOINTER=memory keeps them in RAM instead,
for quick experiments.
"""

import atexit
import logging
import os

from dotenv import load_dotenv
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

load_dotenv()
log = logging.getLogger("imgm_ai.memory")

CHAT_RETENTION_DAYS = (
    30  # chats untouched for longer are deleted (keeps Neon's free 1 GB)
)

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


def delete_old_chats(saver, days: int = CHAT_RETENTION_DAYS) -> int:
    """Delete chats nobody has touched for `days` days. Returns how many were deleted.

    Only for the Postgres checkpointer (RAM chats vanish on restart anyway). A chat's
    age is its newest checkpoint's timestamp.
    """
    if not isinstance(saver, PostgresSaver):
        return 0
    with saver.conn.connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT thread_id FROM checkpoints
            GROUP BY thread_id
            HAVING max((checkpoint ->> 'ts')::timestamptz) < now() - make_interval(days => %(days)s)
            """,
            {"days": days},
        )
        old = [row["thread_id"] for row in cur.fetchall()]
    for thread_id in old:
        saver.delete_thread(thread_id)
    if old:
        log.info("Deleted %d chats older than %d days", len(old), days)
    return len(old)
