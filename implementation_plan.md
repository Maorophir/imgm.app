# IMGM — Full Implementation Plan

## Project Understanding

IMGM is a game database and community review platform where the core differentiator is AI-powered review summarization. Users browse games, submit reviews, and the platform uses LLMs to extract sentiment and generate summaries — eliminating the need to read through dozens of reviews individually.

**Current state:** A monolithic [App.jsx](file:///root/IMGM/imgm.app/imgm-client/src/App.jsx) with inline page components, a Navbar, and basic routing. The [index.css](file:///root/IMGM/imgm.app/imgm-client/src/index.css) contains leftover Vite boilerplate CSS variables that conflict with the Tailwind-first approach you're using. [App.css](file:///root/IMGM/imgm.app/imgm-client/src/App.css) is entirely boilerplate from the old template and can be removed.

---

## Open Questions

> [!IMPORTANT]
> **1. Authentication strategy:** Are you planning to use a third-party auth provider (Google OAuth, Discord, etc.) or build custom email/password auth? This impacts the database schema, the backend middleware, and the Profile page.

> [!IMPORTANT]
> **2. AI provider:** Which LLM API will you use for sentiment extraction — OpenAI, Google Gemini, Anthropic, or a self-hosted model? This determines the backend integration layer. You mentioned you have prompts already engineered — which service are they for?

> [!NOTE]
> **3. Deployment target:** Are you planning to deploy to a VPS, Vercel/Netlify (frontend) + Railway/Fly.io (backend), or a single Docker-based setup? This influences how we structure environment configs and build scripts.

---

## Proposed Architecture (Refined from Your Roadmap)

Your 3-phase roadmap is solid. Below I've kept your structure but added detail, filled gaps, and flagged where AI agents slot in later.

---

### Phase 1: Frontend Architecture & UI

This is the immediate task. Refactor into a clean component-based architecture, build out the UI with mock data, and establish the design system.

#### Step 1 — Refactor folder structure & split components ← **Executing now**

Create the target folder structure and extract components from `App.jsx`:

```
src/
├── components/
│   └── Navbar.jsx          # Extracted from App.jsx
├── pages/
│   ├── Home.jsx            # Hero section extracted from App.jsx
│   ├── Trending.jsx        # Placeholder extracted from App.jsx
│   └── Profile.jsx         # Placeholder extracted from App.jsx
├── services/               # Empty, ready for Phase 2
├── hooks/                  # Empty, ready for Phase 2
├── utils/                  # Empty, ready for Phase 1.3
├── assets/                 # Existing (empty for now)
├── App.jsx                 # Router + Layout shell only
├── main.jsx                # Untouched
└── index.css               # Cleaned up for Tailwind-only
```

**Key changes:**
- [App.jsx](file:///root/IMGM/imgm.app/imgm-client/src/App.jsx) → Router + `<Navbar />` + `<Routes>` only
- Delete [App.css](file:///root/IMGM/imgm.app/imgm-client/src/App.css) (boilerplate, no longer needed)
- Clean [index.css](file:///root/IMGM/imgm.app/imgm-client/src/index.css) to just `@import "tailwindcss";` plus minimal resets (the old CSS variables were from the Vite template and conflict with Tailwind)
- Remove unused `useState` import from App.jsx

#### Step 2 — Reusable component library

Build out reusable UI components:

| Component | Purpose |
|-----------|---------|
| `GameCard.jsx` | Displays cover art, title, platform badges, average score |
| `SentimentBadge.jsx` | Color-coded pill showing AI sentiment (Positive/Negative/Mixed/Neutral) |
| `ReviewCard.jsx` | Single user review with rating, text, and date |
| `AISummaryPanel.jsx` | Glassmorphism card showing the AI-generated summary + sentiment |
| `SearchBar.jsx` | Reusable search input with icon |
| `StarRating.jsx` | Interactive star rating input for review forms |

#### Step 3 — Mock data

Create `utils/mockData.js` with ~8-10 game objects:
```js
{ id, title, coverUrl, platforms, genres, releaseDate, avgScore, reviewCount, aiSentiment, aiSummary }
```

#### Step 4 — Game Details page

- Dynamic route: `/game/:id`
- Sections: Game info header, AI Summary panel, user reviews list, "Write a Review" form
- Uses mock data initially; swaps to API calls in Phase 3

---

### Phase 2: Backend & Database

#### [NEW] `imgm-server/` — Node.js + Express

```
imgm-server/
├── src/
│   ├── routes/          # Express route handlers
│   │   ├── games.js
│   │   ├── reviews.js
│   │   └── users.js
│   ├── controllers/     # Business logic
│   ├── middleware/       # Auth, validation, error handling
│   ├── models/          # Database query functions (raw SQL or Knex)
│   ├── services/        # AI integration layer
│   │   └── ai.js        # LLM API calls for sentiment/summarization
│   ├── db/
│   │   ├── schema.sql   # Table definitions
│   │   ├── seed.sql     # Initial game data
│   │   └── pool.js      # PostgreSQL connection pool
│   └── index.js         # Express app entry point
├── .env.example
└── package.json
```

#### PostgreSQL Schema

```sql
-- Core tables
Users       (id, username, email, password_hash, avatar_url, created_at)
Games       (id, title, slug, cover_url, description, release_date, developer, publisher, platforms[], genres[])
Reviews     (id, user_id FK, game_id FK, rating 1-10, review_text, created_at)

-- AI output (stored alongside reviews for fast retrieval)
ReviewAnalysis (id, review_id FK, sentiment ENUM, summary_text, raw_llm_response JSONB, model_used, analyzed_at)

-- Aggregated AI summary per game (regenerated periodically or on new review)
GameAISummary  (id, game_id FK UNIQUE, overall_sentiment, summary_text, review_count_at_generation, generated_at)
```

> [!TIP]
> **Why separate `ReviewAnalysis` and `GameAISummary` tables?** Individual review sentiment is extracted per-review (cheap, fast). The overall game summary is regenerated from all reviews and is more expensive — you'll want to cache it and only refresh when meaningful new reviews arrive. This separation also lets you swap LLM providers without losing historical data.

#### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games` | List games (paginated, filterable) |
| GET | `/api/games/:id` | Single game + AI summary |
| GET | `/api/games/:id/reviews` | Reviews for a game (paginated) |
| POST | `/api/reviews` | Submit a review (triggers AI analysis) |
| GET | `/api/users/:id` | User profile + their reviews |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |

---

### Phase 3: AI Integration & Full-Stack Hookup

#### 3.1 — Connect frontend to backend
- Create `services/api.js` in the frontend with `fetch` wrappers for all endpoints
- Replace mock data with real API calls using a custom `useApi` hook
- Add loading states, error boundaries, and optimistic UI updates

#### 3.2 — AI analysis pipeline (backend)
When a review is submitted:
1. Save the raw review to `Reviews` table
2. Call the LLM API with your pre-engineered prompt
3. Parse the structured response (sentiment enum + summary text)
4. Save to `ReviewAnalysis` table
5. Check if `GameAISummary` should be regenerated (e.g., every 5 new reviews, or if overall sentiment may have shifted)
6. Return the analysis to the frontend

#### 3.3 — Display AI insights
- `AISummaryPanel` on the Game Details page shows the cached `GameAISummary`
- Each `ReviewCard` shows its individual sentiment badge
- Trending page can sort by AI sentiment trends

---

### Phase 4: AI Agents (Future)

> [!NOTE]
> This phase is deliberately deferred. The architecture above is designed to accommodate it without refactoring.

Potential AI agent capabilities:
- **Review moderation agent:** Auto-flag spam, toxicity, or off-topic reviews before publishing
- **Game recommendation agent:** "Games like X" based on review embeddings stored via `pgvector`
- **Trend analysis agent:** Periodic job that identifies sentiment shifts across games (e.g., "Game X sentiment dropped from Positive to Mixed after patch 2.1")
- **Conversational search agent:** Natural language game discovery ("Find me a cozy RPG with positive reviews about the story")

The `pgvector` extension on PostgreSQL enables all embedding-based features (semantic search, recommendations) without needing a separate vector database.

---

## Phase 1, Step 1 — Execution Plan

This is what I'll do right now:

| # | Action | File |
|---|--------|------|
| 1 | Create `src/components/Navbar.jsx` | [NEW] |
| 2 | Create `src/pages/Home.jsx` | [NEW] |
| 3 | Create `src/pages/Trending.jsx` | [NEW] |
| 4 | Create `src/pages/Profile.jsx` | [NEW] |
| 5 | Rewrite `src/App.jsx` to Router + Layout shell | [MODIFY] |
| 6 | Clean `src/index.css` to Tailwind-only | [MODIFY] |
| 7 | Delete `src/App.css` (boilerplate) | [DELETE] |
| 8 | Create empty placeholder directories | `services/`, `hooks/`, `utils/` |

---

## Verification Plan

### Automated
- `npm run build` to confirm no broken imports or missing modules

### Manual
- Visually confirm the app still renders identically at `http://localhost:5173/`
- Test all three routes (`/`, `/trending`, `/profile`) via the Navbar links
- Confirm HMR still works (edit a page component, see it update live)
