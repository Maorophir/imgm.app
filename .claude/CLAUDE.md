# IMGM (imgm.app): notes for Claude

IMGM ("I Am Gaming") is a game review site. Reviews are quick "quests" with loot-style rarity, and **Play Next** is an AI agent that picks a player's next 5 games. The site is a public beta, built by one developer (Maorophir). **Play Next is open to every player** (Render `PLAY_NEXT=on`), no longer a closed beta. The visual design is "Noir", contributed by roiegold.

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
- **Steam** (built by roiegold, sign-up and family games added 2026-10-30):
  - `imgm-server/src/lib/steamAuth.js` is a Better Auth plugin for Steam's OpenID 2.0, at `/api/auth/steam/*`: connect (`/link`), log in (`/sign-in`), sign up (`/sign-up`, then `/sign-up/pending` + `/sign-up/finish`), `/callback`, `/unlink`. Every check on Steam's answer is there; a refused one logs `Steam login refused: <why>` (never the answer itself). Steam's firewall sometimes answers Render's `check_authentication` with a 403 (a shared data-centre address; a home connection always gets 200), so that check sends a named User-Agent and is tried up to 3 times (`Steam login check: Steam answered 403 (try n of 3)` in the logs). If all three keep failing, the next step is sending the check from another server.
  - Signing up: Steam gives no email, so `/signup/steam` asks for one. The account is made at once and the email confirmed later, like an email sign-up. "Log in with Steam" with a Steam account new to IMGM signs up instead.
  - The library: `services/steamApi.js` + `services/steamLibrary.js`, needs `STEAM_API_KEY` (Render has it). Family Sharing games never appear in GetOwnedGames; GetRecentlyPlayedGames (last 2 weeks) shows them, so each import keeps them as `SteamLibraryGame.shared` ("Shared with you").
  - Pages: `/steam` (public), `/steam/library`, `/signup/steam`; Settings connects and disconnects.
  - Logging in or signing up with Steam never lands on a Steam page (`signInReturn` sends those home; other "come back to" pages are kept). Only Connect Steam returns to the library (the user's call, 2026-10-30).
- **Discover** (`/discover`, built 2026-10-30/31): a TikTok-style feed of games, one trailer per screen, so visitors who don't review still have something to do (most used to leave after a look). Code: `imgm-client/src/pages/Discover.jsx` (the page, `Slide`, `SteamTrailer`, `YouTubeTrailer`), `components/discover/DiscoverComments.jsx`, `lib/navVisibility.js`; server `routes/discover.js`, `controllers/discoverController.js`, `services/steamTrailers.js`, `lib/commentFilter.js`, `getDiscoverGames` in `igdbService.js`.
  - **Open to everyone** since 2026-10-31 (it was a closed beta first). On by default in code (`discoverEnabled` in `lib/config.js`); `DISCOVER=off` on Render takes it back to a closed beta for `DISCOVER_BETA_USERS` (comma-separated user ids). The site asks `GET /api/discover/access` (`hooks/useDiscoverAccess.js`) before showing the menu link and the page. In the sitemap and open to Google.
  - **Feeds:** two tabs, **Hot Now** (`hot`) and **Upcoming** (`upcoming`) (the user's call: New and Trending were nearly the same games; names turned down: Coming soon, Most Anticipated, Most Wanted). `GET /api/games/discover?feed=` (cached 6h): IGDB's popularity rankings (`popularity_primitives`) pick and order them. Hot Now = released in the last 2 years, by visits, 50 games; Upcoming = the next year by "Most Wishlisted Upcoming" and "Want to Play" (a game's best place in either; the wishlist alone misses GTA VI), 40 games. Main games, remakes and remasters, with a trailer. A game known only by its year is dated 31 December by IGDB: the page says "Coming 2027". A feed that fails to load (the server waking or restarting) is tried again after 3s, then shows "Couldn't load the games. Try again". Each feed reopens on the game the player was on (`localStorage imgm.discover.places`); the feed's tab or the back-to-top arrow goes to its first game; a closing card follows the last game.
  - **Trailers:** Steam first (no ads, no logo): `steamTrailers.js` reads Steam's store (`appdetails?filters=basic,movies`, no key; cached a day, a failure retried after an hour, 6 at a time) for each game's Steam app (IGDB `external_games` source 1). Steam streams HLS (`hls_h264`): Safari plays it natively, other browsers through `hls.js` (imported on demand). ~90% of games have one; YouTube is the fallback (it can show ads, and won't play age-restricted videos: its `onError` falls back to the key art). Which Steam trailer (`pickMovie`): by name, launch > gameplay > story > announce > other trailers; never accolades, interviews, developer messages, diaries, updates or add-ons, never a CJK-script name; Steam's "highlight" only breaks ties. One trailer per game (the title links to the game page for more). A feed's first load after the cache expires takes 3–12s (Steam lookups).
  - **Smooth scrolling** (the user's report: Upcoming lagged and trailers froze): only games within 2 of the one on screen are drawn in full (`NEAR`), the rest are their picture (a swipe used to redraw all 40: ~130ms blocked). The next game's Steam trailer loads in advance, paused and hidden (`next`), and is the same player when it comes on screen (~0.5s to start). A Steam video that should be playing but stopped (hls.js cuts off `play()` when it switches quality) is started again every 700ms. YouTube trailers aren't preloaded (too heavy): ~2s.
  - **Sound, like Reels** (the user's calls): every trailer starts muted (sound popping up unannounced puts people off); the first tap turns sound on and pops a speaker icon in the middle for a moment (only then; `animate-flash`, cleared on `animationend`); after that taps pause and play, and the only sound control is the speaker button above the play icon while paused. Muted there, taps only pause/play. Sound stays as set from game to game: a Steam video starts on `canplay`, and only a real `NotAllowedError` turns sound off (iPhones may want a tap per new video; if that becomes a problem, the fix is one shared `<video>` for the feed). Neither player reloads once playing: the `<video>` itself, or YouTube `postMessage` commands (`enablejsapi=1`). A YouTube trailer starts muted (an iPhone shows YouTube's own play button for an unmuted start, seen with GTA VI), stays hidden until YouTube reports it playing, and gets its sound after; if the browser then pauses it, it carries on muted. Not playing 3.5s after loading (Low Power Mode) shows the page's own play button.
  - **Upright phone layout** (iterated with the user on 2026-10-31; screenshots on a phone-sized Playwright page before each change):
    - The site's header is tucked away; a small IMGM pull tab (lime power mark + chevron, top centre) lays it **over** the trailer (nothing moves) and hangs under it to put it away (`navVisibility.js`: mode null / 'hidden' / 'over', read by the Navbar; leaving Discover restores it).
    - The trailer is **square** at the top (a quarter cut from each side; 4:3 was not enough, the full 16:9 left a blank band). Over its top: **Hot Now / Upcoming as small TikTok-style words** (`feedWord`, white with a short line under the one on screen, no frame), a small bare back-to-top arrow at their left (after the first game), the full screen button in line on the right.
    - Under the trailer: an **ivory power line** (a hairline with the IMGM power mark in the middle, ivory, the same for every game; the user turned down a card edge, a rarity-coloured strip and a generic card bottom: the rating belongs only in the line under the title). Then the game's key art, whole, faded like a game page's backdrop; the trailer's poster or a screenshot fills the frame until it plays, so the two pictures differ. 34px title, 1-line description.
  - **Phone on its side** (`low` variant, ≤500px tall) or a **cleared screen**: the feed covers everything (`fixed`, `100dvh`), X at the top left to leave (back, or home), the trailer fills the screen, the actions go in a row (48px), the platforms line and swipe hint hide, 32px title. The page behind never scrolls on a phone; the site's Feedback button hides on Discover below `md`.
  - **Full screen** is a button (never forced, the user's call): the standard API or WebKit's prefixed one (`webkitRequestFullscreen`: iPads, Brave on iPhone). Safari on an iPhone has none, so there it clears the screen (`bare`: only the trailer, timeline and button; "Turn your phone sideways" for 4s when upright). Add to Home Screen is the only way past Safari's bar (`site.webmanifest` is `standalone`).
  - **Computers:** the feed fills the screen under the site's header; boxed Hot Now / Upcoming tabs at the top, back-to-top arrow top left, full screen button top right in line with the actions; the trailer covers the slide (cqw/cqh); the feed has no scrollbar (it pushed the actions out of line).
  - **The actions** (a column at the slide's right edge; 52px wide on a phone, 2px from the edge; they step down below 740px tall, the `tight` variant): thumbs up / down (`DiscoverVote`; just an opinion, the game stays on screen), Comments (with the count), Want it (Backlog), Played it? (one tap on 1–10 saves a quick review and pops the card; a game the player already rated shows "Your 8" and opens their review instead, checked again just before saving, so a written review is never replaced), Share. No speaker in the column.
  - Words over the bottom: when it's out, genre, title (links to the game page), the IMGM rating line (or "No IMGM rating yet…"/"Not out yet…"), and the description: one or two lines, "more" (or a tap on the text) opens it all over the dimmed video, "less" closes it. A timeline (`.discover-timeline`) along the bottom seeks either player.
  - **Mature games** (any board rates them adults only, from IGDB `age_ratings`, or Steam required_age ≥ 17 / adult descriptors) wait for "I'm 18 or older: play it", remembered on the device (`imgm.discover.matureOk`).
  - **Comments** (Discover only, not on game pages: the user's call): a bottom sheet on a phone, a see-through side panel on a computer; the feed keeps playing, and the next game closes it. Most liked first, 20 a page; replies one level deep like TikTok (a reply to a reply joins the thread with `@tag`); like, delete your own (replies go too), report others (emailed to `FEEDBACK_EMAIL`; 3 reports hide one). No editing. The server refuses links, slurs and "kys" (`commentFilter.js`: whole words after folding l33t and accents, so "Scunthorpe", "spicy" and "Niger" pass). 1–300 characters, 5 a minute and 60 a day per player. Reading is open; writing needs a logged-in player. Models `DiscoverComment`, `DiscoverCommentLike`, `DiscoverCommentReport`; the count rides along with `GET /api/discover/votes`.
  - Known gap: a paused YouTube trailer can show YouTube's own "More videos" panel (a dark fade over the bottom while paused was offered; Playwright's browser never shows the panel, so it needs a real phone).
  - The menu: Discover is second (after Games); six links fit one row only from 1280px (`xl`).

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
- Docker Compose services are `db`, `server`, `client` (containers `imgm-postgres`, `imgm-server`, `imgm-client`): `docker compose restart server client`.
- Steam's login can't be done by Claude. To test what comes after it, write a `steam-signup:<token>` Verification row and a signed `better-auth.steam_signup` cookie (`<token>.<HMAC-SHA256 base64 with the secret>`), from a script run inside `imgm-server`.
- The laptop's `imgm-server/.env` has a real Resend key, so local emails are really sent: use `delivered+<tag>@resend.dev` addresses.
- Test accounts use `@example.test` and are deleted by exact email afterwards: `docker exec imgm-postgres psql -U imgm_user -d imgm_db -tAc "delete from \"User\" where email='x@example.test'"`.
- Browser checks: Playwright, run from a scratch folder, not the repo (`npm install playwright` there; launch with `executablePath` set to `~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`, the browser that's installed). Phone checks use `devices['iPhone 13']`. To compare design options, add a temporary `?look=` switch, screenshot each, put them on one board, and remove the switch after the user picks.
- A brand-new client file (e.g. a temporary page) may not get Tailwind styles until `docker compose restart client` (WSL's file watching).

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
  - Play Next picks: the frame is the game's IMGM score rarity (`scoreFrame.js`); the rank is a flat corner tab (`RankTab.jsx`: gold/silver/bronze, then plain). Never colour a pick by its rank.
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

## Releasing
1. Merge `development` into `main` and push (only when the user says so: "release", "ship it", "deploy", "push it"). That deploys Vercel and Render. Claude Code's auto mode blocks the push unless the user's latest request says to release; if blocked, give the user the commands. Then `git switch development` and **restart `imgm-client`** (a merge left the local site serving old code once).
   - Check it's live: the `assets/index-*.js` name on imgm.app changes when Vercel finishes (~1 min); grep the new bundle for a string from the change. Render's restart takes a few minutes and API calls can fail meanwhile.
2. If `imgm-ai` changed, redeploy it on Cloud Run:
   - project `gen-lang-client-0029420490` ("Premium IMGM"), region `europe-west3`, service `imgm-ai`;
   - deploy a clean copy of the committed code: `git archive main imgm-ai | tar -x -C <scratch dir>`, then `gcloud run deploy imgm-ai --source <scratch dir>/imgm-ai --project … --region europe-west3`;
   - `--source` keeps the service's env values and secrets. New settings need `--set-env-vars` / `--set-secrets`;
   - the gcloud CLI is `~/google-cloud-sdk/bin/gcloud` on the desktop. It needs `gcloud auth login` (in the user's terminal); the auto-mode classifier blocks Claude's deploy, so the user runs it.
3. Smoke test on imgm.app with a `delivered+<tag>@resend.dev` account, deleted afterwards with `DELETE /api/users/me` (password + reason). Check: a real answer, the shelves and spotlight, Sort your picks → Replace, no page errors.

## Decisions (and why)
- **Vertex in production, not the free Gemini key:** 20 free calls a day isn't enough, because one answer makes 6–13 calls.
- **`get_game_family` instead of a "sequel" web search:** a web search missed new games by the same studio (Split Fiction for It Takes Two). The tool's limits:
  - Studio games count only if they share a genre AND a game mode with the named game, so unrelated games stay out (Hello Kitty for Elden Ring).
  - At most 1 game from the series and 3 from series + studio in an answer, checked in code.
  - The game the player named is never recommended.
- **Sort your picks** (one screen, then ONE replacement search) replaced the per-card Played it / Not for me buttons, which each started their own search.
- **The chat brief** (grouped picks + honorable mentions) is built by the formatter in its existing call, so it adds no extra latency. Mentions are filtered quietly and never sent back, so they never cost a fix round.
- **Steam sign-up doesn't wait for the email to be confirmed** (the user's call: the same as email sign-up). Someone who signs up with another person's email loses Steam when the real owner resets the password, because **a password reset disconnects Steam** (roiegold's rule, kept on purpose).
- **No Valve "Sign in through Steam" image button:** Valve only requests it; the site uses a plain Noir button with words, no Steam logo.
- **Shared Steam games come only from the last two weeks:** Steam's Families API needs a user token that OpenID sign-in doesn't give, so older shared games can't be fetched (the player can still rate them from search).
- **A draft fixed by the check must read as the first answer:** the player never saw the draft, so the answer can't say "I kept…" or "I swapped…".
