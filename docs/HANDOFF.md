# Handoff (2026-10-30, after the Steam release)

## Where things are
- **The Steam release is live.** `main` = **b357bb4** (Vercel + Render) = `development`, deployed 2026-10-30: the Steam release (23a49c5), a logging hotfix (03b97f8) and "Steam login lands home" (b357bb4). Render has `STEAM_API_KEY`. Cloud Run `imgm-ai` is unchanged, still on revision **imgm-ai-00008**.
- **Hotfix released** (`main` 03b97f8): Steam login refusals are logged with their reason (`Steam login refused: <why>` in Render's logs).
- **Steam login lands home** (released b357bb4): logging in or signing up with Steam lands home, never on a Steam page (logging out on the Steam library used to bring a Steam login back there). Checked live with a cancelled login.
- **`feature/home-hero-carousel`** (not released, built on `feature/steam-hero-carousel`): the home page's hero card takes turns between 6 hand-picked games, hot new and all-time best alternating (`lib/homeShowcase.js` → `heroes`: Clair Obscur, Elden Ring, Resident Evil Requiem, The Witcher 3, Ghost of Yōtei, Red Dead Redemption 2), each with its own score, quote, checklist and backdrop. A backdrop is never the card's own picture: where IGDB's key art is the cover over again (Clair Obscur, Elden Ring, Ghost of Yōtei) it's an official screenshot (`artLabel`), and `artPosition` keeps a logo out from behind the words (RE Requiem, Red Dead 2); the user wants full control over the first thing visitors see, so never live data). Every 6s it turns over to IMGM's back and the key art fades to the next game; it waits on hover, focus, Flip or a hidden tab; dots pick one. The captions' IMGM numbers now come from one Hall of Fame request.
- **`feature/steam-hero-carousel`** (not released): the Steam page's card takes turns between up to 5 games (featured Steam games for visitors, your 5 most played unrated games once connected), turning over to IMGM's back every 5s; dots pick one; it waits on hover, focus or a hidden tab, and never turns by itself for reduced motion.
- Play Next is open to every player. The site as a whole is a public beta.
- The laptop is up to date. **The desktop needs** `git pull`, then `prisma migrate deploy` + `prisma generate` in `imgm-server` (2 new migrations: `steam_library`, `steam_shared_games`), a `STEAM_API_KEY` in its `imgm-server/.env`, and a restart of `imgm-server` and `imgm-client`.

## What the Steam release shipped
- **Connect Steam and log in with it** (roiegold, `feature/steam-connect`): a Better Auth plugin for Steam's OpenID sign-in (`imgm-server/src/lib/steamAuth.js`), connecting from Settings, an email when Steam is connected, a password reset disconnects Steam.
- **The Steam page** (`/steam`) and **the Steam library** (`/steam/library`): every game you own, matched to IGDB, with your hours; Rate it opens the quest with the hours and PC filled in; Backlog for unplayed games.
- **Sign up with Steam:** on the Sign up tab and as the Steam page's main button. Steam gives no email, so `/signup/steam` asks for one; the account is made at once and the email is confirmed later, like an email sign-up. "Log in with Steam" with a Steam account new to IMGM signs up instead of failing.
- **Family Sharing games:** each library import also asks Steam for the last two weeks' games and keeps the ones you don't own, marked "Shared with you".
- Privacy and Terms cover all of it (effective October 30, 2026). Emails load the logo from imgm.app.

## Known issues
- **Steam sign-up failed once in production** with "Steam couldn't confirm it was you" (the `invalid` error), then worked after the hotfix, which only added logging: probably a one-off (a slow start, an expired or reused answer). If it comes back, Render's `Steam login refused: <why>` line names the check. Vercel's `/api` rewrite was checked: it passes `%2B` and `%3D` through unchanged.
- **After Sort**, the model sometimes makes a new game the Best Pick, although the follow-up rule says to keep the kept picks' order. No code check for it yet.
- **Which family game the model picks varies:** for It Takes Two the tool returns Split Fiction and A Way Out, and some answers pick only A Way Out.
- **Locally**, the free Gemini key often times out or runs out of quota, so answers can take 70–150s before Vertex takes over. Production has no free key (~20–40s).
- **Old saved chats** keep a wrong "0 reviews" in their data; the badge now hides a 0 count.
- Shared Steam games played before connecting (and not in the last two weeks) can't be fetched: Steam's Families API needs a user token.

## Next
1. **Release the two carousels** (`feature/home-hero-carousel`, which holds the Steam page one too). The home quotes and scores are Claude's drafts: the user may edit them in `lib/homeShowcase.js`.
2. **Tell roiegold** that Steam can now create accounts (his code said it never would).
3. **Play Next uses the Steam library** (the user's next agent task, written by the user): what you've played and for how long, even with no reviews, and never recommend games you already own.
4. **Jev (TypeSafe) as the screen node.** The user implements it, with Claude's help.
   - Earlier test: 36/36 accuracy, ~0.25s vs Gemini's 0.6–1s.
   - Plan: pin `typesafe-sdk` 0.7.5, keep a Gemini fallback, add `TYPESAFE_API_KEY` as a Cloud Run secret (`--set-secrets`), and add TypeSafe to the Privacy Policy.
5. Optional, ask first: delete merged branches (GitHub `feature/sort-your-picks`, `feature/steam-connect`; local `feature/steam-signup`, `feature/steam-family-games`, `feature/steam-login-lands-home`, `hotfix/steam-callback-logs`, and the desktop's `feature/play-next-polish`).

## How to release (see .claude/CLAUDE.md → Releasing)
`development` → `main` push for the site and server; Cloud Run redeploy from a `git archive` of `main` for the AI service (project `gen-lang-client-0029420490`, `europe-west3`); then the smoke test on imgm.app.
