# Handoff (2026-11-01, after the home page's Discover section)

Read `.claude/CLAUDE.md` first: it explains how everything works. This file says where things stand.

## Where things are
- **Live:** `main` = **89796c6** (Vercel + Render), `development` = the same code plus these docs. Cloud Run `imgm-ai` is unchanged (imgm-ai-00008).
- The site is a public beta. **Play Next** and **Discover** are open to every player.
- **Discover is the newest feature** (built 2026-10-30/31, opened to everyone 2026-10-31): a TikTok-style feed of hot and upcoming games, one trailer per screen (Steam trailers first, YouTube as the fallback), with votes, comments, Want it, one-tap scores and Share. The user shaped the phone layout over many rounds; CLAUDE.md records each decision and what was turned down, so don't re-propose those.
- **The share picture** (`imgm-client/public/og-image.png?v=2`): the site's real cards fanned (The Witcher 3 Legendary 10 in front, Ghost of Yōtei and Elden Ring) beside "I AM GAMING." and three features (rate and collect, Play Next, Discover). It was drawn by rendering `CollectibleCard` on a temporary Vite page and screenshotting it at 1200x630.
- **Releases of 2026-10-30/31**, oldest first:
  - Steam: log in, sign up (email asked, confirmed later), connect from Settings, the library with Family Sharing games ("Shared with you"), login lands home, never on a Steam page; Steam's login check retried with a named User-Agent (Render's address gets 403s from Steam at times).
  - The home hero carousel (6 hand-picked games in `lib/homeShowcase.js`, never live data: the user wants full control of the first screen) and the Steam page carousel.
  - The checklist's new look (B4: rarity-ladder meters) across cards and the review quest; the soft glare on every card.
  - Discover: closed beta (90f0c5b), phones and comments (ea2576b, d23a233), the upright-phone redesign (8a30b31, dd99b87), open to everyone with smooth scrolling (78c1142), a retry for a feed that fails to load (27f11f9).
- **2026-11-01:** the home page's Discover section (a phone playing the feed), Hot Now / Upcoming as words on computers too, and Safari's 480p-first trailer playlists (the likely cause of trailers freezing on iPhones). **Not yet checked on a real iPhone**: try Discover on mobile data.
- **2026-11-01:** card backs fit a full checklist (all 11 answers) with no scrollbar (89796c6): the game page card's turn-back arrow sits by the reviewer's name (no "Flip back" row), "Length" and "PC specs" are card-only short names (`cardTitle` in `questOptions.js`), and the answers spread out when there's room (shrinkable spacers in `CardChecklist.jsx`).
- **Migrations since 2026-10-17:** `steam_library`, `steam_shared_games`, `discover_votes`, `discover_comments` (Render runs them on start).

## The other machine (desktop)
The laptop is up to date. The desktop needs:
- `git pull` on `development`;
- `npm install` in `imgm-client` (new: `hls.js`) and `imgm-server`;
- `prisma migrate deploy` + `prisma generate` in `imgm-server` (the 4 migrations above);
- a `STEAM_API_KEY` in its `imgm-server/.env`;
- a restart of `imgm-server` and `imgm-client`.

## Known issues
- **Paused YouTube trailers** (about 1 game in 10, e.g. GTA VI) can show YouTube's own "More videos" panel. Offered and not yet answered: a dark fade over the bottom of the trailer while paused. Can only be checked on a real phone.
- **iPhone sound while scrolling** isn't confirmed on a real iPhone: Apple may want a tap per new video. If sound keeps dropping, the fix is one shared `<video>` element for the whole feed.
- **Steam login** failed now and then with "Steam couldn't confirm it was you" (`Steam login refused: Steam's check answered 403` in Render's logs): Steam's firewall turns Render's shared address away at times. The check is now tried 3 times with a named User-Agent. If the logs still show `Steam answered 403 (try 3 of 3)`, send the check from another server. Steam's store could do the same to trailer lookups (`Steam trailer lookup ... failed`): those games then fall back to YouTube.
- **After Sort**, the Play Next model sometimes makes a new game the Best Pick, although the follow-up rule says to keep the kept picks' order. No code check for it yet.
- **Which family game the model picks varies:** for It Takes Two the tool returns Split Fiction and A Way Out, and some answers pick only A Way Out.
- **Locally**, the free Gemini key often times out or runs out of quota (answers take 70–150s before Vertex takes over). Production has no free key (~20–40s).
- **Old saved chats** keep a wrong "0 reviews" in their data; the badge hides a 0 count.
- Shared Steam games played before connecting (and not in the last two weeks) can't be fetched: Steam's Families API needs a user token.

## Next
1. **Watch Discover now that it's open:** comment reports arriving at `FEEDBACK_EMAIL` (check it's set on Render), iPhone sound, the paused-YouTube panel, Render's logs for Steam lookup failures. Ideas the user liked for later: a "For you" order from votes and scores (Play Next reading them is agent code: the user writes it), a "guess the game" card every few clips.
2. **Play Next uses the Steam library** (the user's next agent task, written by the user): what you've played and for how long, even with no reviews, and never recommend games you already own.
3. **Jev (TypeSafe) as the screen node.** The user implements it, with Claude's help.
   - Earlier test: 36/36 accuracy, ~0.25s vs Gemini's 0.6–1s.
   - Plan: pin `typesafe-sdk` 0.7.5, keep a Gemini fallback, add `TYPESAFE_API_KEY` as a Cloud Run secret (`--set-secrets`), and add TypeSafe to the Privacy Policy.
4. **Branch cleanup** (the user runs it: Claude's branch deletions are blocked). Every local feature/hotfix branch is merged into `main`:
   ```bash
   git branch --merged origin/main --format='%(refname:short)' | grep -vE '^(main|development)$' | xargs git branch -d
   git push origin --delete feature/sort-your-picks feature/steam-connect   # the remote is `imgm.app` on the desktop
   # Not merged, delete only if unwanted: The-MVP-Race (local, Sept), feature/style-options (remote, the style switcher)
   ```

## How to release (see .claude/CLAUDE.md → Releasing)
`development` → `main` push for the site and server (only when the user says so), then switch back to `development` and restart `imgm-client`; check the new bundle is live. Cloud Run redeploy from a `git archive` of `main` only if `imgm-ai` changed (the user runs the deploy). Then the smoke test on imgm.app.
