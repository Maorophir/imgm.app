# Handoff (2026-10-20)

## Goal
Release the Play Next upgrade to production. It's finished and tested on `development`, and not released yet.

## Repo state
- Branch `development` at **2d818bc**: clean working tree, fully pushed to GitHub (`imgm.app/development`).
- `main` (production) is at **522648c**. `development` is **10 commits ahead**: the Play Next work below.
- The local AI service may still be running on port 8000, on Gemini. `imgm-ai/.env` has `LLM_PROVIDER=gemini` and Vertex is signed in on this machine.

## Done (on development, tested)
- [x] **Server:** `GET /api/games/:id/family` returns a game's series, its studio's games that share a genre and a game mode, and IGDB's similar games. Main games only, released, 10+ IGDB ratings, cached for 6h.
- [x] **Agent:** the `get_game_family` tool. Family games count as already verified.
- [x] **Agent check rules:**
  - at most 1 game from the named game's series;
  - at most 3 from its series + studio together;
  - never the game the player named;
  - prefer the newest family game (prompt only).
- [x] **Honorable mentions** (`Mention`, `good_mentions()`): broken ones are dropped quietly, at most 4.
- [x] **Chat brief, option A** (`BriefGroup`, `ChatBrief.jsx`): picks + mentions grouped under short headings, then "If you only play one: …".
- [x] **Sort your picks** (`SortYourPicks.jsx`, `sortMessage.js`):
  - Noir cards framed by rank, with the IMGM score and the Hall of Fame rank;
  - Keep / Played it (did you like it?) / Not for me, plus Backlog;
  - Done sends ONE message;
  - desktop shows 5 equal-height cards, phones show one card at a time.
  - The old per-card Played it / Not for me buttons and `notForMe` were removed.
- [x] **Per-job model timeouts:** format 25s, screen 15s (it was 60s for everything).
- [x] **Check-fix drafts read as the first answer** (no "I kept / I swapped").
- [x] **Tests:**
  - browser end to end on Gemma: ~100s per answer;
  - browser end to end on Gemini: 32s and 18s;
  - a reopened chat keeps its brief;
  - no page errors.

## Left
- [ ] **The user's go-ahead** to release (they were testing on development).
- [ ] **Merge `development` into `main` and push.** That deploys Vercel (site) and Render (server). No new migrations in this batch.
- [ ] **Redeploy `imgm-ai` on Cloud Run** with `gcloud run deploy`, from a clean `git archive` of the committed code (the established method).
  - The exact service, region and flags aren't recorded in the repo.
  - The CLI needs `gcloud auth login` first: only Application Default Credentials are set up here.
  - Then check the flags with `gcloud run services describe imgm-ai`.
  - Without this redeploy, production keeps the old agent: no family tool, brief, mentions or new timeouts. The site still works; the brief just doesn't appear.
- [ ] **Smoke test on imgm.app:**
  - "a game like it takes two" should include Split Fiction;
  - Sort your picks → Replace;
  - the brief shows.
- [ ] Optional, ask first: delete the merged GitHub branch `feature/sort-your-picks`.
- [ ] **Next feature: Jev (TypeSafe) as the screen node.** The user implements it, with Claude's help.
  - Earlier test: 36/36 accuracy, ~0.25s vs Gemini's 0.6–1s.
  - Plan: pin `typesafe-sdk` 0.7.5, keep a Gemini fallback, add `TYPESAFE_API_KEY` as a Cloud Run secret, and add TypeSafe to the Privacy Policy.

## Central files
- `imgm-ai/src/imgm_ai/agent/`:
  - `tools.py`: `get_game_family`, `FAMILY_SECTIONS`;
  - `nodes.py`: `check_answer`, `game_families`, `good_mentions`, `verified_games`;
  - `prompts.py`;
  - `schemas.py`: `Mention`, `BriefGroup`, `asked_for_series`.
- `imgm-ai/src/imgm_ai/models/llm.py`: `get_model(timeout=)`.
- `imgm-ai/src/imgm_ai/server.py`: the `cards` event now has `mentions` and `brief`.
- `imgm-ai/src/imgm_ai/data/imgm_api.py`: `get_game_family`.
- `imgm-server/src/services/igdbService.js` (`getGameFamily`), `controllers/gamesController.js`, `routes/games.js`.
- `imgm-client/src/components/guide/`: `SortYourPicks.jsx`, `sortMessage.js`, `ChatBrief.jsx`, `HonorableMentions.jsx`, `GuidePanel.jsx`, `GuideTurn.jsx`, `PickCard.jsx`.
- `imgm-client/src/pages/GameGuide.jsx` and `components/BacklogButton.jsx` (the new `variant="icon"`).
- `docs/design/sort-your-picks.{html,md}`: the original design. Its preview is in the old pre-Noir look; the built version is Noir.

## Known issues
- **After Sort**, the model sometimes makes a new game the Best Pick, although the follow-up rule says to keep the kept picks' order. There's no code check for it.
- **Brief headings** can run past the asked 2–6 words, especially on the small backup models.
- **Google's free Gemini models** were often overloaded (503/504) or out of daily quota in development. The fallback chain handles it locally now that Vertex and the paid key are set.
- **Gemma (local)** works end to end, but its picks are weak (a single-player game in a co-op list, invented reasons in intros). Judge pick quality on Gemini.
- **Old saved chats** have no brief, so the panel shows the mentions row instead (by design).

## Constraints
- Release only when the user says so: feature → development → main.
- `imgm-ai` is the user's code. Don't edit it unprompted.
- No AI co-author lines. No emoji in the UI. Noir look.
- Test accounts are `@example.test`, deleted by exact email.

## Exact next step
Ask the user whether `development` is ready to release. If yes:
1. `git switch main && git pull --ff-only imgm.app main && git merge --no-ff development -m "Release: …(from development)" && git push imgm.app main`
2. Redeploy `imgm-ai` on Cloud Run as described above.
3. Run the smoke test on imgm.app.
