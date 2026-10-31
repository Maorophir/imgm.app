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
- **Discover** (`/discover`, started 2026-10-30): a TikTok-style feed of games, one per screen, so visitors who don't review still have something to do (most leave after a look).
  - **A closed beta** like Play Next's was: on Render, `DISCOVER_BETA_USERS` (comma-separated user ids) see it; `DISCOVER=on` opens it to everyone. The site asks `GET /api/discover/access` (`hooks/useDiscoverAccess.js`): the menu link and the page show only when allowed (others are sent home); votes 404 for others. Local development always has it. Kept out of Google until launch.
  - Two tabs (the user's call: New and Trending were nearly the same games): **Hot Now** (feed `hot`) and **Upcoming** (feed `upcoming`). Names the user turned down: Coming soon, Most Anticipated, Most Wanted.
  - `GET /api/games/discover?feed=hot|upcoming` (`getDiscoverGames` in `igdbService.js`, cached 6 hours): IGDB's popularity rankings (`popularity_primitives`) choose and order the games, so big games come first, not the hundreds of small releases a week. Hot Now = released in the last 2 years, by visits (the newest big releases rise to the top), 50 games; Upcoming = the next year by "Most Wishlisted Upcoming" and "Want to Play" (a game's best place in either; the wishlist one alone misses GTA VI), 40 games. Main games, remakes and remasters, with a trailer.
  - `pages/Discover.jsx`: the trailer of the game on screen plays muted edge to edge (a YouTube embed scaled to cover the slide, using cqw/cqh); the others show their key art. IGDB dates a game known only by its year as 31 December: the page says "Coming 2027".
  - **Trailers come from Steam first** (no ads, no YouTube logo): `services/steamTrailers.js` reads Steam's store data (`appdetails?filters=basic,movies`, no key; cached a day, a failure retried after an hour, 6 at a time) for each game's Steam app (IGDB `external_games` source 1). Steam streams HLS (`hls_h264`, CORS `*`): Safari/iPhone play it natively, other browsers through `hls.js` (dynamically imported). ~90% of the feeds' games have one; YouTube is the fallback (it can show ads, and won't play age-restricted videos: the player's `onError` message makes the page fall back to the key art). A feed's first load after the cache runs out takes 3–5s (Steam lookups).
  - Neither trailer reloads once playing: starts muted (sound popping up unannounced puts people off), first tap = sound on, then tap = pause/play; the sound's only control after that is the speaker button over the play icon while paused, like Reels; muted there, taps only pause/play until it turns sound back on (the user's call) (the `<video>` itself, or YouTube `postMessage` commands with `enablejsapi=1`). Sound stays on from game to game: a Steam video starts on `canplay`, and only a real `NotAllowedError` (the browser refusing sound) turns it off. iPhones may still ask for a tap per new video (Apple's rule); if so, the fix is one shared `<video>` element for the whole feed.
  - A YouTube trailer always starts muted (an iPhone shows YouTube's own play button for an unmuted start, seen with GTA VI) and stays hidden until YouTube reports it playing; the sound comes on after that. If the browser then pauses it (no tap for sound), it carries on muted and the speaker says so. Not playing 3.5s after loading (e.g. Low Power Mode) shows the page's own play button, and a tap starts it.
  - **Full screen:** on an upright phone the site's header is tucked away in Discover; a small IMGM pull tab (power mark + chevron, top centre) lays it over the top of the trailer, so nothing below moves, and hangs under it to put it away (`lib/navVisibility.js`: a shared mode, null / 'hidden' / 'over', that the Navbar reads; leaving Discover brings it back; the user's call, 2026-10-31); a phone on its side (`max-height: 500px`, or `max-width: 767px` landscape) or a cleared screen covers everything (`fixed`, `100dvh`, X at the top left to leave: back, or home). The page behind never scrolls on a phone, and the site's Feedback button hides there below `md` (it covered the actions). The browser's own full screen is a button in the top right corner, never forced (the user's call): the standard API or WebKit's prefixed one (`webkitRequestFullscreen`: iPads, and Brave on iPhone, whose WebKit has element full screen on). Safari on an iPhone has none, so there the button clears the screen (`bare`): the trailer fills it, cropped, with only the timeline and the button over it, and "Turn your phone sideways" for 4s when upright (Add to Home Screen is the only way past Safari's own bar; `site.webmanifest` is `standalone`). The actions (thumbs, Comments, Want it, Played it?, Share; the sound isn't one) are a column at the slide's right edge (on a phone 52px wide, 2px from the edge), under that button, which sits in the same column (the user's call); the words stay in the site's 1180px column. The feed has no scrollbar (on a computer it pushed the actions out of line with the button). The back-to-top arrow: top left on a computer, a small bare arrow beside the feeds' words on an upright phone (the user asked for it back), none on a phone on its side (the X is there; the feed's tab does it).
  - **Upright screens** (`orientation: portrait`): the trailer square at the very top of the feed (a quarter off each side: the user wanted more screen for the video than 4:3 gave; the whole 16:9 left a blank band); on an upright phone the feeds are small words at the top over it, like TikTok's (`feedWord`: the one on screen white with a short line under it; no frame), under the IMGM menu tab, with a small bare back-to-top arrow at their left and the full screen button in line on the right; the swipe hint hides, and the game's key art whole in the rest of the screen under it, behind the words, faded like a game page's backdrop (dimmed from the trailer's edge down, a shade on the left). The cut between them is designed, not hidden (the user's call): the lower edge of a generic IMGM card, 28px of card stock with rounded lower corners and a hairline rim, holding the small print every card carries (power mark + IMGM, Beta · imgm.app). The same for every game: no score there (an upcoming game can't have one); it takes no space from the video (the trailer's poster or a screenshot fills the frame until it plays, so the two pictures differ); a 34px title. Sideways it fills the screen. Trailers with black bars baked in keep them. On a phone on its side (the `low` variant, ≤500px tall) the actions go in a row (48px each), the platforms line and the swipe hint hide, and the title is 32px.
  - **The sound in the middle, like Reels** (the user's call, 2026-10-31): no speaker in the side column. When a tap turns the sound on (only then: the user's call), its icon pops up in the middle of the trailer for a moment (`animate-flash`, cleared on `animationend` so playing again after a pause doesn't replay it); while paused, the speaker is a real button above the play icon (a layer over the tap layer, in the trailer's own frame; the play icon lets taps through to play again).
  - The description shows two lines; "more" (or tapping the text, shown only when it's cut) opens it all, scrolling inside a capped height, with the video dimmed behind it like TikTok; "less" closes it.
  - Played it?: one tap on 1–10 saves a quick review (`POST /api/reviews` with just the rating) and pops the card. The votes endpoint also returns the player's own `myRating`, and a rated game shows "Your 8" (opens the quest) instead: a quick score would replace a written review's answers, so it's offered only when there's none (checked again with `GET /api/reviews/mine/:id` just before saving).
  - One trailer per game in the feed (the user's call: the swipe rhythm is one game per swipe); the title links to the game page for the rest (no separate "More videos" link).
  - Which Steam trailer (`pickMovie` in `steamTrailers.js`): by name, launch > gameplay > story > announce/reveal > other trailers; never accolades, interviews, developer/director messages, diaries, updates or add-ons; never a name in CJK script (YouTube's English one instead); Steam's "highlight" only breaks ties (it's often the accolades reel).
  - Each feed reopens on the game the player was on (`localStorage imgm.discover.places`, per feed); the arrow at the top left or the feed's own tab goes to its first game; a closing card after the last game offers the top and the other feeds.
  - A timeline (`<input type=range>`, `.discover-timeline` in index.css) along the slide's bottom edge seeks both players (Steam `currentTime`; YouTube `seekTo` + its `infoDelivery` time messages), kept clear of the site's Feedback button.
  - The menu: Discover is second (after Games). Six links fit on one row only from 1280px (`xl`); below that the links take a second row. The search box wraps by a 200px basis at `xl` (a flex row wraps by each box's starting size), then grows to 380px.
  - **Mature games** (any board rates them adults only: ESRB M/AO, PEGI 18, USK 18, CERO Z, ACB R18+…, from IGDB `age_ratings`; or Steam's required_age ≥ 17 / adult content descriptors; Steam's own age field is unreliable, e.g. 0 for Call of Duty) wait for "I'm 18 or older: play it", remembered on the device (`localStorage imgm.discover.matureOk`). The details, votes and buttons show to everyone.
  - **Comments** (the user's call: Discover only, not on game pages): a Comments button (with the count, which rides along with the votes' `GET /api/discover/votes`) opens `components/discover/DiscoverComments.jsx`, a bottom sheet on a phone and a right-side panel on a computer; the feed keeps playing, and a new game on screen closes it. Most liked first, then newest, 20 a page. Replies are one level deep like TikTok (a reply to a reply joins the same thread and starts with `@tag`); "View N replies" opens them. A heart likes; your own can be deleted (replies go too), others' reported (`DiscoverCommentReport`, emailed to `FEEDBACK_EMAIL`; 3 reports set `hidden`). No editing. The server refuses links and slurs/"kys" (`lib/commentFilter.js`: whole words after folding l33t and accents, so "Scunthorpe", "spicy" and "Niger" pass; words with an everyday meaning like "chink in the armour" are left to reports). Limits: 5 a minute and 60 a day per player, 1–300 characters. Routes: `GET /api/discover/games/:id/comments?page=`, `GET /api/discover/comments/:id/replies`, `POST /api/discover/games/:id/comments {body, parentId?}`, `DELETE /api/discover/comments/:id`, `PUT …/:id/like {liked}`, `POST …/:id/report`. Writing needs a logged-in beta player (like votes); reading is open.
  - Seven actions fit a phone because they step down below 740px tall (the `tight` variant in index.css: 40px buttons); on an iPhone SE-sized screen (548px) the column still touches the full screen button.
  - Thumbs up / down (`DiscoverVote`, one per player per game, `GET /api/discover/votes?ids=` + `PUT /api/discover/votes/:gameId {value: 1|-1|0}`; private/no-store because it carries the player's own vote). A vote is just an opinion: the game stays on screen.

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
1. Merge `development` into `main` and push (only when the user says so). That deploys Vercel and Render.
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
