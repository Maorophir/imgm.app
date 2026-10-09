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
        kwargs={
            "autocommit": True,
            "prepare_threshold": 0,
            "row_factory": dict_row,
            # A connection can die without a word (the PC slept, Docker/WSL dropped it,
            # Neon cut it): with no timeouts, the next query on it waits FOREVER and the
            # chat hangs before it starts. These make the OS give up within seconds:
            "connect_timeout": 10,  # s: opening a connection
            "tcp_user_timeout": 15000,  # ms: data sent but never acknowledged
            "keepalives": 1,  # idle connections are probed…
            "keepalives_idle": 30,  # …after 30s of quiet,
            "keepalives_interval": 10,  # every 10s,
            "keepalives_count": 3,  # and dropped after 3 missed answers
        },
        min_size=1,
        max_size=5,
        timeout=20,  # s: waiting for a free connection, then fail (and say so) instead of hanging
        # Neon's free database sleeps after 5 quiet minutes and cuts every connection.
        # Each one is tested before use, and a dead one is swapped for a fresh one.
        check=ConnectionPool.check_connection,
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
