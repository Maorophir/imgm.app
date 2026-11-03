# Handoff (2026-11-03, after the iPhone fixes and the README draft)

Read `.claude/CLAUDE.md` first: it explains how everything works. This file says where things stand.

## Where things are
- **Live:** `main` = **20c2ca9d** (Vercel + Render), `development` = the same code plus these docs. Cloud Run `imgm-ai` is unchanged (imgm-ai-00008).
- **Not merged:** `feature/readme` (pushed): the new README, waiting for the user's look (see Next).
- The site is a public beta. **Play Next** and **Discover** are open to every player.
- **Discover is the newest feature** (built 2026-10-30/31, opened to everyone 2026-10-31): a TikTok-style feed of hot and upcoming games, one trailer per screen (Steam trailers first, then Xbox, YouTube as the last resort), with votes, comments, Want it, one-tap scores and Share. The user shaped the phone layout over many rounds; CLAUDE.md records each decision and what was turned down, so don't re-propose those.
- **The share picture** (`imgm-client/public/og-image.png?v=2`): the site's real cards fanned (The Witcher 3 Legendary 10 in front, Ghost of Yōtei and Elden Ring) beside "I AM GAMING." and three features (rate and collect, Play Next, Discover). It was drawn by rendering `CollectibleCard` on a temporary Vite page and screenshotting it at 1200x630.
- **Releases of 2026-10-30/31**, oldest first:
  - Steam: log in, sign up (email asked, confirmed later), connect from Settings, the library with Family Sharing games ("Shared with you"), login lands home, never on a Steam page; Steam's login check retried with a named User-Agent (Render's address gets 403s from Steam at times).
  - The home hero carousel (6 hand-picked games in `lib/homeShowcase.js`, never live data: the user wants full control of the first screen) and the Steam page carousel.
  - The checklist's new look (B4: rarity-ladder meters) across cards and the review quest; the soft glare on every card.
  - Discover: closed beta (90f0c5b), phones and comments (ea2576b, d23a233), the upright-phone redesign (8a30b31, dd99b87), open to everyone with smooth scrolling (78c1142), a retry for a feed that fails to load (27f11f9).
- **2026-11-01:** the home page's Discover section (a phone playing the feed), Hot Now / Upcoming as words on computers too, and Safari's 480p-first trailer playlists (the first of the iPhone fixes; the rest came on 2026-11-02, below).
- **2026-11-01:** card backs fit a full checklist (all 11 answers) with no scrollbar (89796c6): the game page card's turn-back arrow sits by the reviewer's name (no "Flip back" row), "Length" and "PC specs" are card-only short names (`cardTitle` in `questOptions.js`), and the answers spread out when there's room (shrinkable spacers in `CardChecklist.jsx`).
- **2026-11-02**, all released, oldest first (found with the user's iPhone and a temporary `?debug=1` playback panel, since removed):
  - Every trailer's video is emptied when it leaves the page (`releaseVideo`); the Steam page card's caption and dots are centred under it (nudged 12px right, the user's call).
  - **Steam trailers through Steam's Web API** (`IStoreBrowseService/GetItems`, 50 games a request, d4eb2db0): the store's `appdetails` answered Render with 403s, so on imgm.app no Upcoming game had a Steam trailer (all YouTube). Now Hot Now 42/50, Upcoming 39/40.
  - **Xbox trailers** as the second source (7436bd22, `xboxTrailers.js`): GTA VI plays Xbox's trailer. Only `cdn.trailers.xboxservices.com` (Microsoft's other host refuses by location).
  - **Trailers start on iPhones** (100cab74): play() as soon as a video has its address (an iPhone loads nothing until play(); waiting for a frame left every trailer paused). hls.js everywhere but iPhones (Chrome on a computer plays HLS itself but starts on the smallest stream), and Xbox trailers start at 1080p on a computer.
  - **Sound stays on from game to game on iPhones** (20c2ca9d): 4 shared players kept for the visit, unlocked by every tap (`trailerVideo.js`). The user saw trailers play on the iPhone after 100cab74 (14 of 14 in the panel); **the sound fix is waiting on the user's iPhone test.**
- **Migrations since 2026-10-17:** `steam_library`, `steam_shared_games`, `discover_votes`, `discover_comments` (Render runs them on start).

## The other machine (laptop)
Work on 2026-11-02/03 was on the desktop, which is up to date. The laptop needs `git pull` on `development` and a restart of `imgm-client` and `imgm-server` (no new packages, migrations or settings since 2026-11-01).

## Known issues
- **Paused YouTube trailers** (about 1 game in 10, e.g. GTA VI) can show YouTube's own "More videos" panel. Offered and not yet answered: a dark fade over the bottom of the trailer while paused. Can only be checked on a real phone.
- **iPhone sound from game to game** isn't confirmed on a real iPhone yet (the shared players, 20c2ca9d). If it still drops, ask which game, and whether it was a YouTube one (those are separate players).
- **Right after a release, one feed loses its Steam trailers for ~5 minutes:** Steam refused the first lookup after Render's restart twice (Hot Now once, Upcoming once); the 5-minute retry fixes it, and Xbox covers some games meanwhile. The Render log line `Steam trailer lookup for N apps failed: <why>` would say why (asked, not seen yet); a quick second try a few seconds later is the likely fix.
- **Steam login** failed now and then with "Steam couldn't confirm it was you" (`Steam login refused: Steam's check answered 403` in Render's logs): Steam's firewall turns Render's shared address away at times. The check is now tried 3 times with a named User-Agent. If the logs still show `Steam answered 403 (try 3 of 3)`, send the check from another server. (Trailer lookups no longer use Steam's store, see above.)
- **After Sort**, the Play Next model sometimes makes a new game the Best Pick, although the follow-up rule says to keep the kept picks' order. No code check for it yet.
- **Which family game the model picks varies:** for It Takes Two the tool returns Split Fiction and A Way Out, and some answers pick only A Way Out.
- **Locally**, the free Gemini key often times out or runs out of quota (answers take 70–150s before Vertex takes over). Production has no free key (~20–40s).
- **Old saved chats** keep a wrong "0 reviews" in their data; the badge hides a 0 count.
- Shared Steam games played before connecting (and not in the last two weeks) can't be fetched: Steam's Families API needs a user token.

## Next
1. **The README** (`feature/readme`, [on GitHub](https://github.com/Maorophir/imgm.app/blob/feature/readme/README.md)): the user reviews it. Open: a Play Next picture (the user's screenshot of a real answer, or a local Gemini run if they say so), and whether to upload MP4s in GitHub's editor for inline video (the scratch recordings). Then merge to `development`; it reaches the front page with the next release. CLAUDE.md → Conventions → The README says how the images were made.
2. **Watch Discover now that it's open:** comment reports arriving at `FEEDBACK_EMAIL` (check it's set on Render), iPhone sound, the paused-YouTube panel, Render's logs for Steam lookup failures. Ideas the user liked for later: a "For you" order from votes and scores (Play Next reading them is agent code: the user writes it), a "guess the game" card every few clips.
3. **Play Next uses the Steam library** (the user's next agent task, written by the user): what you've played and for how long, even with no reviews, and never recommend games you already own.
4. **Jev (TypeSafe) as the screen node.** The user implements it, with Claude's help.
   - Earlier test: 36/36 accuracy, ~0.25s vs Gemini's 0.6–1s.
   - Plan: pin `typesafe-sdk` 0.7.5, keep a Gemini fallback, add `TYPESAFE_API_KEY` as a Cloud Run secret (`--set-secrets`), and add TypeSafe to the Privacy Policy.
5. **Branch cleanup** (the user runs it: Claude's branch deletions are blocked). Every local feature/hotfix branch is merged into `main`:
   ```bash
   git branch --merged origin/main --format='%(refname:short)' | grep -vE '^(main|development)$' | xargs git branch -d   # also clears the 2026-11-02 branches (discover-release-video, steam-dots, steam-trailers-batch, discover-debug, discover-xbox, iphone-play, shared-video, remove-debug)
   git push origin --delete feature/sort-your-picks feature/steam-connect   # the remote is `imgm.app` on the desktop
   # Not merged, delete only if unwanted: The-MVP-Race (local, Sept), feature/style-options (remote, the style switcher)
   ```

## How to release (see .claude/CLAUDE.md → Releasing)
`development` → `main` push for the site and server (only when the user says so), then switch back to `development` and restart `imgm-client`; check the new bundle is live. Cloud Run redeploy from a `git archive` of `main` only if `imgm-ai` changed (the user runs the deploy). Then the smoke test on imgm.app.
