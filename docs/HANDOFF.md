# Handoff (2026-10-30, after the Steam release)

## Where things are
- **The Steam release is live.** `main` = **b6720dd** (Vercel + Render) = `development`, deployed 2026-10-30: the Steam release (23a49c5), a logging hotfix (03b97f8), "Steam login lands home" (b357bb4), the two carousels (03bfc4b), and the home hero + the checklist's new look + the glare on every card (b6720dd). Render has `STEAM_API_KEY`. Cloud Run `imgm-ai` is unchanged, still on revision **imgm-ai-00008**.
- **Hotfix released** (`main` 03b97f8): Steam login refusals are logged with their reason (`Steam login refused: <why>` in Render's logs).
- **Steam login lands home** (released b357bb4): logging in or signing up with Steam lands home, never on a Steam page (logging out on the Steam library used to bring a Steam login back there). Checked live with a cancelled login.
- **Home hero carousel** (released 03bfc4b): the home page's hero card takes turns between 6 hand-picked games, hot new and all-time best alternating (`lib/homeShowcase.js` → `heroes`: Clair Obscur, Elden Ring, Resident Evil Requiem, The Witcher 3, Ghost of Yōtei, Red Dead Redemption 2), each with its own score, quote, checklist and backdrop. A backdrop is never the card's own picture: where IGDB's key art is the cover over again (Clair Obscur, Elden Ring, Ghost of Yōtei) it's an official screenshot (`artLabel`), and `artPosition` keeps a logo out from behind the words (RE Requiem, Red Dead 2); the user wants full control over the first thing visitors see, so never live data). Every 6s it turns over to IMGM's back and the key art fades to the next game; it waits on hover, focus, Flip or a hidden tab; dots pick one. The captions' IMGM numbers now come from one Hall of Fame request.
- **Home hero, checklist and glare** (released b6720dd), four changes:
  - The home hero's backdrop starts right under the navbar (behind the big title too, no black strip). Backdrops: Clair Obscur and Elden Ring screenshots, RE Requiem and Red Dead 2 key art, The Witcher 3 Geralt and Ciri (the cover's own picture: the user's choice), Ghost of Yōtei's lookout screenshot (the user's favourite; a try at landscapes for all six was rolled back).
  - The card is smaller (300px, 330px from 1280px wide; phones 260, tablets 300); on desktop it starts beside the title, with Flip under it and the dots on their own line under Flip, on the art's bottom edge; all of it fits 1280×800 and 768px-tall laptops. The art's last row is 256–260px: just enough for the Play Next panel that floats under the words.
  - **The checklist's new look (B4), across the site:** card backs (`CardChecklist`: "The verdict", small-caps categories, ivory answers, a `ChecklistMeter` bar under each) and the review quest's checklist (no tick boxes: the picked answer takes its colour, a meter by each category). The colours are IMGM's rarity ladder (`checklistColor` in questOptions.js): a scale climbs Junk grey → Legendary gold, neutral categories are grey.
  - Every card gets the soft glare that follows the pointer (was Legendary only; the moving gilt stays Legendary only).
- **Steam page carousel** (released 03bfc4b): the Steam page's card takes turns between up to 5 games (featured Steam games for visitors, your 5 most played unrated games once connected), turning over to IMGM's back every 5s; dots pick one; it waits on hover, focus or a hidden tab, and never turns by itself for reduced motion.
- **`feature/discover-demo`** (not released, a demo): **Discover**, a Reels/TikTok-style feed of games at `/discover` (not in the menu yet, kept out of Google). One game per screen, snapping; the game on screen plays its trailer muted (YouTube, from IGDB) over its blurred key art; the IMGM verdict, release line ("Out in 12 days"), platforms; actions: Want it (the real Backlog), Played it? (a 1–10 score that opens the quest), Not for me (next), Share, sound. Feeds New / Coming soon / Trending, built from the 40 featured games for now, so Coming soon is empty. Why: visitors who don't review have nothing to do, and leave; every swipe should be one tap toward a review or a Backlog item, and teach Play Next.
- Play Next is open to every player. The site as a whole is a public beta.
- The laptop is up to date. **The desktop needs** `git pull`, then `prisma migrate deploy` + `prisma generate` in `imgm-server` (2 new migrations: `steam_library`, `steam_shared_games`), a `STEAM_API_KEY` in its `imgm-server/.env`, and a restart of `imgm-server` and `imgm-client`.

## What the Steam release shipped
- **Connect Steam and log in with it** (roiegold, `feature/steam-connect`): a Better Auth plugin for Steam's OpenID sign-in (`imgm-server/src/lib/steamAuth.js`), connecting from Settings, an email when Steam is connected, a password reset disconnects Steam.
- **The Steam page** (`/steam`) and **the Steam library** (`/steam/library`): every game you own, matched to IGDB, with your hours; Rate it opens the quest with the hours and PC filled in; Backlog for unplayed games.
- **Sign up with Steam:** on the Sign up tab and as the Steam page's main button. Steam gives no email, so `/signup/steam` asks for one; the account is made at once and the email is confirmed later, like an email sign-up. "Log in with Steam" with a Steam account new to IMGM signs up instead of failing.
- **Family Sharing games:** each library import also asks Steam for the last two weeks' games and keeps the ones you don't own, marked "Shared with you".
- Privacy and Terms cover all of it (effective October 30, 2026). Emails load the logo from imgm.app.

## Known issues
- **Steam login failed now and then in production** with "Steam couldn't confirm it was you": Render's log said `Steam login refused: Steam's check answered 403`. Steam's firewall turns away Render's shared address at times (from a home connection the same request always gets 200, with or without a User-Agent). **`hotfix/steam-check-retry`** sends a named User-Agent and tries the check up to 3 times. If Render's logs still show `Steam answered 403 (try 3 of 3)`, the next step is sending the check from another server.
- **After Sort**, the model sometimes makes a new game the Best Pick, although the follow-up rule says to keep the kept picks' order. No code check for it yet.
- **Which family game the model picks varies:** for It Takes Two the tool returns Split Fiction and A Way Out, and some answers pick only A Way Out.
- **Locally**, the free Gemini key often times out or runs out of quota, so answers can take 70–150s before Vertex takes over. Production has no free key (~20–40s).
- **Old saved chats** keep a wrong "0 reviews" in their data; the badge now hides a 0 count.
- Shared Steam games played before connecting (and not in the last two weeks) can't be fetched: Steam's Families API needs a user token.

## Next
1. **Discover, after the user tries the demo:** (2) server lists from IGDB: new releases, upcoming, trending, with trailers, cached; (3) the real feed page; (4) the actions for real: Played it? saves a quick review in one tap and pops the card, Not for me is remembered; (5) "For you" ordering from swipes and reviews (Play Next reading the swipes is agent code: the user writes it). Later: a "guess the game" card every few clips.
2. **Tell roiegold** that Steam can now create accounts (his code said it never would).
3. **Play Next uses the Steam library** (the user's next agent task, written by the user): what you've played and for how long, even with no reviews, and never recommend games you already own.
4. **Jev (TypeSafe) as the screen node.** The user implements it, with Claude's help.
   - Earlier test: 36/36 accuracy, ~0.25s vs Gemini's 0.6–1s.
   - Plan: pin `typesafe-sdk` 0.7.5, keep a Gemini fallback, add `TYPESAFE_API_KEY` as a Cloud Run secret (`--set-secrets`), and add TypeSafe to the Privacy Policy.
5. Branch cleanup (the user runs it: Claude's branch deletions are blocked), merged branches (GitHub `feature/sort-your-picks`, `feature/steam-connect`; local `feature/steam-signup`, `feature/steam-family-games`, `feature/steam-login-lands-home`, `feature/steam-hero-carousel`, `feature/home-hero-carousel`, `feature/home-hero-band-top`, `hotfix/steam-callback-logs`, and the desktop's `feature/play-next-polish`).

## How to release (see .claude/CLAUDE.md → Releasing)
`development` → `main` push for the site and server; Cloud Run redeploy from a `git archive` of `main` for the AI service (project `gen-lang-client-0029420490`, `europe-west3`); then the smoke test on imgm.app.
