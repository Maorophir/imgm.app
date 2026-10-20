# IMGM (imgm.app): notes for Claude

IMGM ("I Am Gaming") is a game review site. Reviews are quick "quests" with loot-style rarity, and **Play Next** is an AI agent that picks a player's next 5 games. It's a public beta, built by one developer (Maorophir). The visual design is "Noir", contributed by roiegold.

## Architecture
| Part | Stack | Production |
|---|---|---|
| `imgm-client` | React 19, Vite, Tailwind 4, React Router 7, lucide-react | Vercel. `vercel.json` rewrites `/api/*` to Render, so the browser sees one site: first-party cookies, no CORS. |
| `imgm-server` | Express 5, Prisma 7, Zod 4, Better Auth, express-rate-limit | Render. `npm start` runs `prisma migrate deploy` first. |
| Database | Postgres + pgvector | Neon |
| `imgm-ai` | Python 3.12, FastAPI, LangGraph, LangChain, uv | Google Cloud Run, deployed separately (see Releasing) |

- **The AI service is not public.** Express proxies to it and sends `X-User-Id` + `X-Internal-Key`. The agent's tools get the player's id from the LangGraph `config`, never as a tool argument the model controls (prompt-injection safety).
- **The Play Next graph:** `screen` (find / chat / off_topic) → `agent` ⇄ `tools` → `format` (structured `Recommendations`) → `check`. The check is plain code that enforces the rules and sends problems back, up to 2 fix rounds.
  - The code is in `imgm-ai/src/imgm_ai/agent/`: `nodes.py`, `prompts.py`, `schemas.py`, `tools.py`.
  - The rule: **the prompt asks, the code enforces.** Every hard rule lives in `check_answer()`.
- **Tools:**
  - `get_my_taste`;
  - `search_imgm_reviews` (RAG over pgvector, in the separate `imgm_ai` DB);
  - `search_games` (IGDB through Express);
  - `get_game_profile`;
  - `search_web` (Tavily, at most 2 per answer);
  - `get_game_family` (Express `GET /api/games/:id/family`).
- **Models:** `get_model()` in `imgm-ai/src/imgm_ai/models/llm.py`.
  - The provider is set by `LLM_PROVIDER` (`ollama` locally / `gemini`).
  - Gemini runs as a fallback chain: free key → Vertex → paid key. A model that fails is skipped for a while.
  - Production has no free key: Vertex first, then the paid key.
  - Each job sets its own timeout. Format is 25s and screen is 15s, because a non-streamed call can hang until its timeout (one Vertex format call hung for 60s).

## Run locally
- `docker compose up -d` starts Postgres (`imgm-postgres`, user `imgm_user`, db `imgm_db`), the server on :5000 and the client on :5173.
  - The server container runs `npm install`, `prisma migrate deploy` and `prisma generate` on every start.
- The AI service runs on the host, from `imgm-ai/`: `uv run uvicorn imgm_ai.server:app --host 0.0.0.0 --port 8000`.
  - The server reaches it at `host.docker.internal:8000`.
  - Stop it with `pkill -f "[u]vicorn imgm_ai.server"`. The brackets stop the pattern from matching your own shell.
- Local models:
  - **Ollama:** `gemma4:e4b`, about 100s per answer. Good for "does it work", weak picks.
  - **Gemini:** set `LLM_PROVIDER=gemini` in `imgm-ai/.env`. Vertex needs `gcloud auth application-default login`.
- Restarts:
  - Editing a server file restarts nodemon, which cuts any Play Next answer that's streaming.
  - After `git switch` or a merge, restart `imgm-client` (Vite can serve stale files).
  - After a Prisma schema change, run `prisma generate` and restart `imgm-server`.

## Commands
- Client: `npm run lint`, `npx vite build` in `imgm-client`.
  - Lint has one old, known error (react-refresh in `SentimentBadge.jsx`). It isn't a blocker.
- Server: there are no tests. Check syntax with `node --check <file>`.
- New migration: `docker exec imgm-server npx prisma migrate dev --name <name>`.
  - The files are created as root. Before git can touch them, run `docker exec imgm-server chown -R <uid>:<gid> prisma/migrations/<dir>`.
- Agent traces without the web page: `uv run python -c ...` with `graph.invoke(new_turn(question), {"configurable": {"thread_id": ...}})`.
- Test accounts use `@example.test` and are deleted by exact email afterwards: `docker exec imgm-postgres psql -U imgm_user -d imgm_db -tAc "delete from \"User\" where email='x@example.test'"`.
- Browser checks: Playwright, run from a scratch folder, not the repo.

## Conventions
- **Git:**
  - `main` = production: pushing it deploys Vercel and Render.
  - `development` = testing.
  - Work happens on `feature/*` branches off `development`.
  - Merge to `main` only when the user says so.
  - No AI co-author or attribution lines in commits or PRs.
  - The GitHub remote is `imgm.app` on the desktop and `origin` on the laptop.
- **UI (Noir):**
  - No emoji in the UI; use Lucide line icons.
  - Lime (`bg-brand`) marks one primary action per page only.
  - Square-ish corners, hairline borders, no glow.
  - Rarity colours come from `--color-rarity-*` and `getRarity()`.
  - Buttons come from `lib/ui.js`.
  - Text is ivory/white, not italic in long passages.
- **Code style:** match the surrounding comment density. Comments say *why*, in plain English.
- **Working with the user:**
  - Small steps, explained simply.
  - Show changes as ```diff blocks.
  - Preview UI (screenshots of the real page) before building big things.
- **Agent code (`imgm-ai`) belongs to the user**, who is learning LangGraph.
  - Write copyable code with a short "why", and apply it only when asked.
  - Review what they paste; indentation slips have happened.
- **Never paste secrets.** `.env` files are per machine and never committed.

## Decisions (and why)
- **Vertex in production, not the free Gemini key:** 20 free calls a day isn't enough, because one answer makes 6–13 calls.
- **`get_game_family` instead of a "sequel" web search:** a web search missed new games by the same studio (Split Fiction for It Takes Two). The tool's limits:
  - Studio games count only if they share a genre AND a game mode with the named game, so unrelated games stay out (Hello Kitty for Elden Ring).
  - At most 1 game from the series and 3 from series + studio in an answer, checked in code.
  - The game the player named is never recommended.
- **Sort your picks** (one screen, then ONE replacement search) replaced the per-card Played it / Not for me buttons, which each started their own search.
- **The chat brief** (grouped picks + honorable mentions) is built by the formatter in its existing call, so it adds no extra latency. Mentions are filtered quietly and never sent back, so they never cost a fix round.
- **A draft fixed by the check must read as the first answer:** the player never saw the draft, so the answer can't say "I kept…" or "I swapped…".
