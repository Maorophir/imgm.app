# Handoff (2026-10-20, after the release)

## Where things are
- **Everything is released.** `main` = `development` content at **3f7a4b1** (Vercel + Render), and Cloud Run `imgm-ai` is on revision **imgm-ai-00008** (100% of traffic).
- **Play Next is open to every player** (Render `PLAY_NEXT=on`; `/api/guide/access` says `enabled: true` to logged-out visitors). It is no longer a closed beta. The site as a whole is still a public beta.
- The production smoke test passed (2026-10-20): a real answer in 40s with Split Fiction, shelves + spotlight, the deal, Sort your picks → Replace in 20s, no "0 reviews", no page errors. The test account was deleted.

## What this release shipped
- **Agent:** the `get_game_family` tool, series/studio caps, never the named game, honorable mentions, the brief groups, per-job model timeouts, fixed drafts read as first answers, and the right review count on cards looked up from Express (`reviewStats.count`).
- **Side panel:** Sort your picks above the picks; every pick framed by its IMGM score's rarity (gilt for a 10/10, plain when unrated); its rank as a flat corner tab (1ST gold, 2ND silver, 3RD bronze, then plain).
- **Sort your picks:** the cards are dealt from a face-down IMGM deck and flip over (a tap skips it; off for reduced motion); titles fit one box so the art lines up; the dialog renders into `<body>` so the header can't cover it on phones.
- **Chat:** the brief is shelves of small framed covers (picks with rank tabs, mentions tagged), tap for details (why, score, Backlog, Open game); small shelves sit side by side; "If you only play one" is a featured card.
- **Home teaser:** rank tabs instead of the old Legendary/Epic/Rare rings.

## Known issues
- **After Sort**, the model sometimes makes a new game the Best Pick, although the follow-up rule says to keep the kept picks' order. No code check for it yet.
- **Which family game the model picks varies:** for It Takes Two the tool returns Split Fiction and A Way Out, and some answers pick only A Way Out.
- **Locally**, the free Gemini key often times out or runs out of quota, so answers can take 70–150s before Vertex takes over. Production has no free key (~20–40s).
- **Old saved chats** keep a wrong "0 reviews" in their data; the badge now hides a 0 count.

## Next
- **Jev (TypeSafe) as the screen node.** The user implements it, with Claude's help.
  - Earlier test: 36/36 accuracy, ~0.25s vs Gemini's 0.6–1s.
  - Plan: pin `typesafe-sdk` 0.7.5, keep a Gemini fallback, add `TYPESAFE_API_KEY` as a Cloud Run secret (`--set-secrets`), and add TypeSafe to the Privacy Policy.
- Optional, ask first: delete the merged GitHub branch `feature/sort-your-picks`, and the merged local branch `feature/play-next-polish` (never pushed).

## How to release (see .claude/CLAUDE.md → Releasing)
`development` → `main` push for the site and server; Cloud Run redeploy from a `git archive` of `main` for the AI service (project `gen-lang-client-0029420490`, `europe-west3`); then the smoke test on imgm.app.
