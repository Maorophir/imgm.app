# The IMGM AI service (Play Next) as a container, for Google Cloud Run.
# Build:  docker build -t imgm-ai .
FROM python:3.12-slim

# uv, the same tool used in development, pinned to the same version
COPY --from=ghcr.io/astral-sh/uv:0.12.15 /uv /uvx /bin/

# Don't run as root. The user owns /app from the start: changing ownership later
# (chown -R) would copy every file into a new layer and double the image size.
RUN useradd --create-home app && mkdir /app && chown app /app
USER app
WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_CACHE=1 \
    PYTHONUNBUFFERED=1

# Dependencies first: this layer is cached and only rebuilt when they change
COPY --chown=app pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

# Then the code itself
COPY --chown=app src ./src
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"
# Cloud Run says which port to listen on ($PORT, usually 8080)
CMD ["sh", "-c", "exec uvicorn imgm_ai.server:app --host 0.0.0.0 --port ${PORT:-8080}"]
