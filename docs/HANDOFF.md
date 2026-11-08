# Handoff (2026-11-08, after the launch week; continue on either machine)

Read `.claude/CLAUDE.md` first: it explains how everything works. This file says where things stand.

## Where things are
- **Live:** `main` = **6f69bdc0** (2026-11-07, Vercel + Render). Cloud Run **`imgm-ai-00017`** (built by the trigger from 6f69bdc0). `development` = main + docs only.
- The site is a public beta. **Play Next**, **Discover** and the **daily Guess the game** are open to every player. The user is getting ready to post IMGM on LinkedIn (drafts below).
- **Done by the user (2026-11-06/07):** made themselves admin on Neon; a budget alert in Google Cloud; the `GRANT SELECT` on the Steam tables for the AI's read-only Neon user (see CLAUDE.md → Architecture).
- **The privacy notice question is closed:** the user chose no bell line about the 2026-11-05 Privacy Policy changes ("only close friends use it so far").

## Released 2026-11-06/07, oldest first
- **a503c7cb: the community features** (admin with Stats and Visitors, the bell and opt-in emails, follows / taste match / compare links, card sets, First Edition, the Community menu), the **daily game rework** (Skip, captions, quote / studio / blurred trailer clues, the share picture), and **Google login taking over an unconfirmed account**. Smoke test passed on imgm.app with a throwaway account.
- **c9f26b8d: launch safety** after a full security check: rate limits on the visitor's real address (Better Auth had ONE login bucket for the whole site), per-email login limits, better-auth 1.7.18 (two "sign in as another user" advisories), security headers, Play Next's site-wide ceiling (1000 a day), Log in / Sign up returning to the page. Checked live.
- **a6fa82e8: countries in the visitor counter** (Vercel doesn't pass its country header through the rewrite, so the server looks it up: ip3country, credited in the Privacy Policy).
- **25f0abe2: the Games page** (five shelves, search as you type, titles typed halfway) and the **daily game's layout** (the guess box under the picture, clues and guesses in the side column on computers, the same six pictures at the end with "Show them as you played them", no starting over once the answer is known, every account starting clean).
- **b8ecf1ad: Play Next reads the player's Steam hours** (the Steam menu at the bottom left of the Play Next panel; `get_my_steam_games`; library picks marked on their cards). The user designed the menu and wrote/approved each agent step.
- **0debb6c5: the README brought up to date** (the daily game, Steam in Play Next, Jev, the Games page, the community, four new "problems worth reading about"; new screenshots `docs/readme/daily.webp`, `games.webp`).
- **6f69bdc0: two Play Next fixes.** (1) After b8ecf1ad every Play Next answer failed in production (`permission denied for table SteamLibraryGame`: the read-only Neon user had no grant on the new tables); the user ran the GRANT, and now a Steam read that fails is logged and skipped, never fatal. (2) One length rule for the agent and the writer ("play this weekend" is no limit, "finish this weekend" is under 10h): an answer that took 62s with a fix round now takes ~28s. Found by reading LangSmith's `imgm-production` traces.
- **Migrations since 2026-11-05:** `admin_role_activity`, `notifications`, `daily_guess`, `follows`, `visitor_counter`, `daily_quote_clip` (all live; new tables or columns, nothing dropped).

## The LinkedIn post
A separate agent drafted it from the memory files, CLAUDE.md, this file, the README and git history: a short version, a story version (Claude recommended it), three openings, an image suggestion (attach nothing: the link preview shows the share picture), hashtags and a check list. They were given to the user in the chat on 2026-11-07 (the scratchpad copy doesn't survive). Checked since: the repo is public, and Play Next's Steam hours are live. Open for the user: tag roiegold by name if he's on LinkedIn, keep or cut the security paragraph, links in the post or the first comment.

## The other machine
All of 2026-11-06/07 was on the **laptop**. To catch up the desktop:
```bash
cd /home/maorophir/IMGM/imgm.app && git switch development && git pull imgm.app development
docker compose up -d && docker compose restart server client   # npm install (better-auth 1.7.18, ip3country…), the daily_quote_clip migration, prisma generate
cd imgm-ai && uv sync                                           # nothing new since typesafe-sdk, but cheap to run
```
- No new `.env` values. Locally the AI service uses the full-access database user, so permission problems like 2026-11-07's only show in production (CLAUDE.md → Architecture).
- Playwright's browser: `chromium_headless_shell-1243` on the laptop, `1248` on the desktop.

## Known issues
- **Things only a real phone can check:** the daily game's blurred trailer moment on an iPhone (never played on a real one), "Share your result" → Share image, iPhone sound from game to game in Discover (20c2ca9d, unconfirmed), and paused YouTube trailers showing YouTube's "More videos" panel (a dark fade was offered, not answered).
- **Steam login** fails now and then (Steam's firewall turns Render's address away; the check is tried 3 times). Email and Google sign-up are the reliable paths.
- **Steam lists some games twice** (GTA V and GTA V Enhanced): the model can name one twice; the duplicate rule catches it, at the cost of a fix round.
- **Slow agent turns:** single Gemini calls of ~19s happen (seen in a trace); answers run 20–40s, sometimes 60–75s.
- **Right after a release, one Discover feed loses its Steam trailers for ~5 minutes** (Steam refuses the first lookup after Render restarts; the 5-minute retry fixes it).
- **Two cards never show First Edition:** the one that pops after a one-tap score in Discover, and the Steam library's rated cards.
- **After Sort**, the model sometimes makes a new game the Best Pick (the kept picks' order isn't checked in code).
- **LangSmith:** reading traces (`list_runs`, `read_run`) uses `POST /runs/query`, which stops working on 2027-01-31. Sending traces isn't affected. Before reading traces after that date, update the library (`uv lock --upgrade-package langsmith` in `imgm-ai`); as of 2026-11-07 even 0.14.17 still uses it.
- **Resend's free plan** sends 100 emails a day: a busy sign-up day could hit it (the user was asked to check their plan).
- **Old saved chats** keep a wrong "0 reviews" in their data; the badge hides a 0 count. Shared Steam games older than two weeks can't be fetched.

## Next
1. **The LinkedIn post** (the user's), then watch the admin pages (who comes, what they do, countries) and Render's / Cloud Run's logs.
2. **Emails:** `EMAILS` is still off on Render (only a dry run in the log). The user decides when to turn the opt-in emails on.
3. **Jev suggesting the agent's path** (the user's idea for the agent; the user writes it, one small step at a time, Claude asks before every agent edit): Jev answers yes/no questions about a find request (names a game? new games? limits?) in the same call as the route, and the agent gets hints. Measure in traces.
4. **Discover ideas the user liked:** a "For you" order from votes and scores; a "guess the game" card every few clips.
5. **Branch cleanup** (the user runs it: Claude's branch deletions are blocked). Every local `feature/*`, `fix/*` and `hotfix/*` branch is merged into `main`:
   ```bash
   git branch --merged origin/main --format='%(refname:short)' | grep -vE '^(main|development)$' | xargs git branch -d
   # Not merged, delete only if unwanted: First-initialization, backup-before-strip, backup-old-main (local), feature/style-options (remote)
   ```

## How to release (see .claude/CLAUDE.md → Releasing)
`development` → `main` push (only when the user says so), then back to `development` and restart `imgm-client`; check the new bundle is live. `imgm-ai/` changes deploy themselves through Cloud Build (check the build and the new revision). A table the agent starts reading needs a GRANT for the read-only Neon user first. Then a smoke test on imgm.app with a `delivered+<tag>@resend.dev` account, deleted after.
