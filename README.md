<p align="center">
  <a href="https://imgm.app"><img src="imgm-client/public/og-image.png" alt="IMGM: I Am Gaming. Rate a game in 2 minutes, Play Next picks your next 5 games, Discover what's hot and what's coming." width="100%"></a>
</p>

<h3 align="center">Play it. Rate it. Collect it.</h3>

<p align="center">
  A game review site where every review is a quick quest, every score is loot,<br>
  and an AI agent picks the next five games you'll actually want to play.
</p>

<p align="center">
  <a href="https://imgm.app"><img alt="Live at imgm.app" src="https://img.shields.io/badge/live-imgm.app-c6eb4e?style=for-the-badge&labelColor=100f0d"></a>
  <img alt="Public beta" src="https://img.shields.io/badge/status-public%20beta-e2b65e?style=for-the-badge&labelColor=100f0d">
  <a href="LICENSE.md"><img alt="License: PolyForm Noncommercial" src="https://img.shields.io/badge/license-PolyForm%20NC-b276d6?style=for-the-badge&labelColor=100f0d"></a>
</p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React_19-20232a?style=flat-square&logo=react&logoColor=61dafb">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-20232a?style=flat-square&logo=vite&logoColor=ffd62e">
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_4-20232a?style=flat-square&logo=tailwindcss&logoColor=38bdf8">
  <img alt="Express 5" src="https://img.shields.io/badge/Express_5-20232a?style=flat-square&logo=express&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-20232a?style=flat-square&logo=prisma&logoColor=white">
  <img alt="PostgreSQL + pgvector" src="https://img.shields.io/badge/Postgres_+_pgvector-20232a?style=flat-square&logo=postgresql&logoColor=6b9ae8">
  <img alt="Python 3.12" src="https://img.shields.io/badge/Python_3.12-20232a?style=flat-square&logo=python&logoColor=ffd43b">
  <img alt="LangGraph" src="https://img.shields.io/badge/LangGraph-20232a?style=flat-square&logo=langchain&logoColor=white">
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-20232a?style=flat-square&logo=googlegemini&logoColor=8e75ff">
</p>

<p align="center">
  <a href="#rate-a-game-in-two-minutes">Features</a> ·
  <a href="#play-next-the-ai-agent">Play Next</a> ·
  <a href="#under-the-hood">Under the hood</a> ·
  <a href="#run-it-locally">Run it locally</a>
</p>

---

## Rate a game in two minutes

<table>
  <tr>
    <td width="40%" align="center"><img src="docs/readme/quest.webp" alt="The review quest on a phone: drag the stars to 9 (Epic), pick your setup and the game's vibe, write a line, and the review becomes a purple Epic card." width="300"></td>
    <td>
      <p>A review on IMGM isn't a form. It's a <b>quest</b>: up to nine quick screens, every one skippable.</p>
      <ul>
        <li><b>Your rating:</b> tap or drag across ten stars.</li>
        <li><b>Your setup:</b> platform, hours, finished or still playing, solo or co-op.</li>
        <li><b>The vibe:</b> cozy, chaotic, atmospheric, rage-inducing…</li>
        <li><b>When did it get good?</b> Instantly, or after many hours.</li>
        <li><b>The checklist:</b> graphics, gameplay, audio, story, difficulty, grind, length, PC specs, price, in plain words like <i>"One more match" (it's 4 AM)</i>.</li>
        <li><b>It's like ___ meets ___</b>, pros and cons, best and worst moment, and final words.</li>
      </ul>
      <p>Every screen earns XP toward your level, and reviews unlock badges. In a hurry? <b>Quick review</b> is just the score.</p>
    </td>
  </tr>
</table>

## Every rating becomes a collectible card

<table>
  <tr>
    <td>
      <p>Your score sets the card's <b>rarity</b>, from a grey Junk card to a gold Legendary one:</p>
      <p><img src="docs/readme/rarity.svg" alt="The rarity ladder: Junk 1–2, Common 3–4, Uncommon 5, Rare 6–7, Epic 8–9, Legendary 10" width="100%"></p>
      <ul>
        <li>The card tilts toward your pointer, with a soft glare across it.</li>
        <li><b>Flip it</b> and its back is <b>the verdict</b>: every checklist answer on a meter in the rarity colours.</li>
        <li>Pick the art from the game's covers and screenshots, then <b>share</b> it as a picture.</li>
        <li>A game's IMGM score is its players' average, with the same rarity.</li>
      </ul>
    </td>
    <td width="40%" align="center"><img src="docs/readme/card.webp" alt="The home page's card for Clair Obscur: Expedition 33 (10, Legendary) tilting, flipping to its verdict checklist, then turning over to Elden Ring." width="300"></td>
  </tr>
</table>

## Discover: what's hot and what's coming, trailer by trailer

<table>
  <tr>
    <td width="40%" align="center"><img src="docs/readme/discover.webp" alt="Discover on a phone: swiping from Call of Duty: Modern Warfare 4 to Phantom Blade Zero, Aion 2 and Nomad Drive, each trailer playing full width." width="300"></td>
    <td>
      <p>A feed like the ones on your phone, but every screen is a game. <b>Hot Now</b> is the most visited games of the last two years; <b>Upcoming</b> is the most wanted games of the next year, ranked by IGDB's popularity data.</p>
      <ul>
        <li><b>Trailers without ads:</b> streamed from Steam's own video servers, then Xbox's, and YouTube only as the last resort.</li>
        <li>Thumbs up or down, <b>comments</b> with replies and likes, <b>Want it</b> for your backlog, and <b>Played it?</b> for a one-tap score.</li>
        <li>Sound like Reels: it starts muted, and one tap turns it on for the whole feed.</li>
        <li>Built for phones: square trailers upright, full screen on its side.</li>
      </ul>
    </td>
  </tr>
</table>

<p align="center"><img src="docs/readme/discover-desktop.webp" alt="Discover on a computer: Dear Passengers from the Upcoming feed, its trailer filling the screen, with the actions down the right edge." width="88%"></p>

## Play Next: the AI agent

Tell Play Next what you're in the mood for (*"something cozy for a rainy evening"*, *"games like Hades but longer"*) and it picks **five games for you**. It reads your own reviews and what IMGM players say about each game, and it checks its own answer before you see it.

It's a **LangGraph** agent in Python, with its own tools:

```mermaid
flowchart LR
    Q([Your question]) --> S{screen}
    S -- find games --> A[agent]
    S -- just chatting --> C([a short reply])
    A <--> T[[tools]]
    A --> F[format<br/>5 structured picks]
    F --> K{check}
    K -- breaks a rule<br/>up to 2 fix rounds --> A
    K -- passes --> R([Your 5 picks])
```

| Tool | What it does |
|---|---|
| `get_my_taste` | Your reviews: what you loved, what you didn't, the vibes you pick. |
| `search_imgm_reviews` | Searches every IMGM review by meaning (RAG over **pgvector**). |
| `search_games` | Searches IGDB's catalogue through the IMGM server. |
| `get_game_profile` | One game in depth: genres, modes, length, IMGM score. |
| `get_game_family` | A game's series and its studio's similar games, so new releases aren't missed. |
| `search_web` | A web search (Tavily) for what's too new for the rest, at most twice an answer. |

**The prompt asks, the code enforces.** Every hard rule lives in plain Python in [`check_answer()`](imgm-ai/src/imgm_ai/agent/nodes.py): five different games, each one found by a real search, nothing you've already reviewed or turned down, playable on your platforms, no longer than you asked for, never the game you named, at most one from its series, and exactly one Best Pick. A broken rule sends the draft back to the agent to fix. The agent never sees your user id as something it could change: its tools read it from the graph's config, so a prompt injection can't make it look at someone else's reviews.

Then you **sort your picks**: mark the ones you've played or don't want, and one search replaces them all.

## And the rest of IMGM

<table>
  <tr>
    <td width="50%"><img src="docs/readme/game.webp" alt="A game page: Clair Obscur: Expedition 33, 10.0 Legendary, with its trailer and screenshot viewer."><p align="center"><b>Game pages</b>: trailers and screenshots, the IMGM score, an AI summary of what players praise and criticize, and where to buy.</p></td>
    <td width="50%"><img src="docs/readme/hall-of-fame.webp" alt="The Hall of Fame: the top 13 games as rated by IMGM players, filterable by platform."><p align="center"><b>Hall of Fame</b>: the best-rated games on IMGM, by platform.</p></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/readme/game-of-the-week.webp" alt="Game of the Week: The Witcher 3: Wild Hunt, chosen by IMGM players, with its score breakdown."><p align="center"><b>Game of the Week</b>: chosen by the community every week.</p></td>
    <td width="50%"><img src="docs/readme/steam.webp" alt="The Steam page: Bring your Steam games, with a card waiting to be rated."><p align="center"><b>Steam</b>: log in with Steam, and every game you own lines up with your hours, ready to rate.</p></td>
  </tr>
</table>

Plus a **backlog** for later, **player profiles** with levels and badges, and helpful votes on reviews.

---

## Under the hood

```mermaid
flowchart LR
    B([Browser]) --> V["<b>imgm-client</b><br/>React 19 · Vite · Tailwind 4<br/><i>Vercel</i>"]
    V -- "/api/* (same site:<br/>first-party cookies, no CORS)" --> E["<b>imgm-server</b><br/>Express 5 · Prisma 7 · Better Auth<br/><i>Render</i>"]
    E --> P[("Postgres<br/><i>Neon</i>")]
    E -- "private, shared key" --> AI["<b>imgm-ai</b><br/>FastAPI · LangGraph<br/><i>Cloud Run</i>"]
    AI --> VDB[("pgvector<br/>reviews by meaning")]
    AI --> G{{Gemini on Vertex AI}}
    AI -- "search_games, game family" --> E
    E --> IGDB{{IGDB}}
    E --> ST{{"Steam · Xbox<br/>trailers, libraries, login"}}
    E --> RS{{Resend email}}
```

| Part | Stack | Runs on |
|---|---|---|
| [`imgm-client`](imgm-client) | React 19, Vite, Tailwind 4, React Router 7, lucide-react, hls.js | Vercel |
| [`imgm-server`](imgm-server) | Express 5, Prisma 7, Zod 4, Better Auth, express-rate-limit | Render |
| [`imgm-ai`](imgm-ai) | Python 3.12, FastAPI, LangGraph, LangChain, uv | Google Cloud Run |
| Database | PostgreSQL with pgvector | Neon |

<details>
<summary><b>A few problems worth reading about</b></summary>

<br>

- **Steam login without a Steam SDK.** Steam speaks OpenID 2.0, which Better Auth doesn't, so [`steamAuth.js`](imgm-server/src/lib/steamAuth.js) is a Better Auth plugin written for it: connect, log in, sign up (Steam gives no email, so it asks for one), and disconnect. Every check on Steam's answer is in one place.
- **Trailers without YouTube's ads.** Discover asks Steam's Web API for a whole feed's trailers in one request (one request per game got Render's address turned away), and Microsoft's store catalog for games that aren't on Steam. Both stream HLS from their own servers.
- **iPhones and video.** Safari starts a stream on the first quality it's listed with, and Steam lists 1080p first: the server serves a copy of the playlist with 480p first (the video still comes from Steam). An iPhone loads nothing until `play()`, and only plays sound from a `<video>` a tap once started: Discover starts every trailer at once and keeps four shared players that the first tap unlocks.
- **Smooth on a phone.** Only the games next to the one on screen are drawn in full, and the next trailer loads in advance, so a swipe starts it in about 0.15s.
- **Comments that stay civil.** Links, slurs and "kys" are refused after folding l33t speak and accents, by whole words, so Scunthorpe still gets through.
- **AI that fails over.** Gemini runs as a chain (Vertex AI first, then a paid key), each job with its own timeout, and a model that fails is skipped for a while.

</details>

<details>
<summary><b>The repository</b></summary>

<br>

```text
imgm.app/
├── imgm-client/        the website (React)
│   └── src/
│       ├── pages/          one file per page: Home, Discover, GameDetails, ReviewQuest…
│       ├── components/     cards, the review quest's screens, Discover, the home page…
│       └── lib/            the API client, rarity, buttons and other shared pieces
├── imgm-server/        the API (Express)
│   ├── prisma/             the database schema and migrations
│   └── src/
│       ├── routes/  controllers/   the endpoints
│       ├── services/       IGDB, Steam, Xbox, trailers, email
│       └── lib/            auth, Steam login, the comment filter, config
├── imgm-ai/            Play Next (Python)
│   └── src/imgm_ai/
│       ├── agent/          the graph: nodes, prompts, schemas, tools
│       └── models/         the model chain (Ollama locally, Gemini in production)
└── docker-compose.yml  Postgres, the server and the client, for local work
```

</details>

## Run it locally

You'll need **Docker**, and for Play Next, **Python 3.12** with [uv](https://docs.astral.sh/uv/).

```bash
git clone https://github.com/Maorophir/imgm.app.git
cd imgm.app

# Settings: copy each example and fill it in (IGDB needs a free Twitch app)
cp imgm-server/.env.example imgm-server/.env
cp imgm-ai/.env.example imgm-ai/.env

# Postgres on :5432, the server on :5000, the website on http://localhost:5173
docker compose up -d
```

The server runs its database migrations on every start. Play Next runs on your own machine:

```bash
cd imgm-ai
uv run uvicorn imgm_ai.server:app --host 0.0.0.0 --port 8000
```

Locally it can use [Ollama](https://ollama.com) (`LLM_PROVIDER=ollama`, free and slow: good for "does it work") or Gemini (`LLM_PROVIDER=gemini`).

| Where | Command |
|---|---|
| `imgm-client` | `npm run lint` · `npx vite build` |
| `imgm-server` | `docker exec imgm-server npx prisma migrate dev --name <name>` for a new migration |

## Credits

- **Design:** the "Noir" look is by **roiegold**.
- **Game data:** [IGDB](https://www.igdb.com). **Trailers:** Steam and Xbox, played from their own servers, and YouTube.
- Built by **Maorophir**, one developer, as a public beta. Feedback is welcome on the site (the Feedback button) or in an issue.

## License

Copyright © 2026 Maorophir. The code is public so you can learn from it, under the [PolyForm Noncommercial License 1.0.0](LICENSE.md):

- You may read it and use it for **non-commercial** purposes (learning, personal projects), as long as you **keep the copyright notice and credit IMGM**.
- **Commercial use is not allowed** without written permission. Want to use it commercially? Get in touch.
- The IMGM name and logo are not covered by the license.
