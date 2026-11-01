/**
 * Home page — the front door of IMGM ("/"), in the Noir look.
 *
 * This is a "page component": it represents an entire route ("/"), loads the data and
 * lays out the sections. The bigger sections live in components/home/.
 *
 * From the top:
 *   the hero          "I am gaming.", what IMGM is in one sentence, the way in (rate a
 *                     game), and a recent review with its words as a real card laid
 *                     across a band of key art (HomeHero)
 *   the rarity        what your score does: a second real card and the 1–10 ladder
 *   featured games    the popular recent releases from IGDB, ten at a time
 *   fresh reviews     the newest reviews as small cards with their words
 *   game of the week  this week's winner and next week's ballot, with the time left
 *                     to vote and the way to the Game of the Week page (GotwStrip)
 *   be the first      popular games nobody has reviewed yet
 *
 * Everything shown is real: the cards are reviews players wrote, and the art belongs
 * to the game the caption names. When there's nothing to show, a section waits or
 * steps aside instead of making something up.
 *
 * The data: the featured games and the newest reviews load side by side. Each review
 * comes with what its game's big card and the band need (genre, year, studio, the key
 * art, the game's IMGM score), so the hero's card, the band and its caption all paint
 * together. The site owner can pin the hero's review on the server; it comes in the
 * same list, marked `pinned`. The Game of the Week section needs nothing from either,
 * so it loads its own (the same answer the Game of the Week page gets).
 */
import { HOME_SHOWCASE } from '../lib/homeShowcase';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getFeaturedGames, getRecentReviews, getTopGames } from '../lib/api';
import { WRAP, TEXT_BUTTON, TEXT_BUTTON_SM, SECTION_TITLE } from '../lib/ui';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import GameCard from '../components/GameCard';
import GameCardSkeleton from '../components/GameCardSkeleton';
import LoadError from '../components/LoadError';
import HomeHero from '../components/home/HomeHero';
import RaritySection from '../components/home/RaritySection';
import DiscoverSection from '../components/home/DiscoverSection';
import { FreshReviews, ReviewPicks } from '../components/home/FreshReviews';
import GotwStrip from '../components/home/GotwStrip';

const PAGE_SIZE = 10; // games per carousel page (2 rows on desktop)
// The games whose key art the hero shows (Played these? puts them last)
const HERO_GAME_IDS = HOME_SHOWCASE.heroes.map((slide) => slide.band.id);

const Home = () => {
  // Featured games from IGDB (via our backend). null = still loading.
  const [games, setGames] = useState(null);
  const [error, setError] = useState(false);
  // Bumping this number re-runs the fetch effect below ("Try again")
  const [attempt, setAttempt] = useState(0);
  // The newest reviews on any game (the cards). null = still loading, [] = none,
  // false = they couldn't be loaded (the cards then step aside without saying "none").
  const [reviews, setReviews] = useState(null);

  // Which page of the Featured Games carousel is showing (0-based)
  const [page, setPage] = useState(0);
  const featuredRef = useRef(null);

  // Fetch featured games on mount, and again whenever "Try again" bumps `attempt`
  useEffect(() => {
    const controller = new AbortController();

    getFeaturedGames(controller.signal)
      .then(setGames)
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Featured games request failed:', err);
        setError(true);
      });

    return () => controller.abort();
  }, [attempt]);

  // The newest reviews feed three sections (the hero card, the rarity card, Fresh from
  // the community), so they're fetched once, here
  useEffect(() => {
    const controller = new AbortController();
    getRecentReviews(controller.signal)
      .then(setReviews)
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setReviews(false); // the review cards just step aside
      });
    return () => controller.abort();
  }, []);

  const recent = reviews || [];

  // The showcase games' IMGM average and review count, for the captions under the
  // cards: { 305152: { ratings: { imgm: 8.5 }, reviewCount: 32 } } (empty until loaded).
  // They're top games, so one Hall of Fame request has them all (a game that has left
  // it just shows its name).
  const [showcaseStats, setShowcaseStats] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    getTopGames({ sort: 'rank' }, controller.signal)
      .then(({ games: top }) =>
        setShowcaseStats(
          Object.fromEntries(top.map((game) => [game.id, { ratings: { imgm: game.average }, reviewCount: game.reviewCount }]))
        )
      )
      .catch(() => {}); // the captions just show the games' names
    return () => controller.abort();
  }, []);

  const retry = () => {
    setError(false);
    setGames(null); // back to the loading skeleton
    setAttempt((n) => n + 1);
  };

  // Carousel: slice out the games for the current page
  const gameCount = games?.length ?? 0;
  const pageCount = Math.ceil(gameCount / PAGE_SIZE);
  const pageGames = games?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  // Wrap around at the ends, like a carousel: last page → first, first → last
  const goToPage = (next) => setPage((next + pageCount) % pageCount);

  // Fresh from the community: the newest reviews, never the pinned review (it may be
  // months old). Still null while loading, and [] hides the section.
  const freshReviews = reviews === null ? null : recent.filter((review) => !review.pinned);

  // "Browse games": glide down to the featured games (a jump for people who ask their
  // device for less motion), and carry keyboard focus there too. A Cmd/Ctrl/Shift/Alt
  // click is left to the browser, so the link still opens in a new tab or window.
  const reducedMotion = usePrefersReducedMotion();
  const browse = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const section = featuredRef.current;
    if (!section) return;
    section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
  };

  // A one-line notice after leaving or confirming an email (the address says which)
  const [searchParams, setSearchParams] = useSearchParams();
  const notice = searchParams.get('goodbye') === '1'
    ? { title: 'Your account is deleted.', text: "Thanks for playing with us. You're always welcome back." }
    : searchParams.get('verified') === '1'
      ? { title: 'Your email is verified.', text: '' }
      : null;

  return (
    // overflow-x-clip: the tilted cards and the full-width band never cause a sideways
    // scroll on phones. The bottom padding plus the footer's margin is the design's gap.
    <main className="overflow-x-clip pb-12 md:pb-16">
      {notice && (
        <div className={`${WRAP} pt-6`}>
          <div role="status" className="flex items-center justify-between gap-4 rounded-sm border border-slate-700 bg-slate-900 px-5 py-2">
            <p className="text-slate-200">
              <span className="font-semibold text-white">{notice.title}</span> {notice.text}
            </p>
            <button type="button" onClick={() => setSearchParams({})} className={`shrink-0 ${TEXT_BUTTON_SM}`}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* The two big cards are a fixed showcase (lib/homeShowcase), not players' reviews;
          the captions under them carry their games' live IMGM numbers */}
      <HomeHero slides={HOME_SHOWCASE.heroes} stats={showcaseStats} onBrowse={browse} />

      {/* TEMPORARY ?look=strip: the second Discover design, to compare the two */}
      <DiscoverSection look={searchParams.get('look') === 'strip' ? 'strip' : 'phone'} />

      <RaritySection card={HOME_SHOWCASE.rarity.card} game={{ ...HOME_SHOWCASE.rarity.game, ...showcaseStats[HOME_SHOWCASE.rarity.game.id] }} />

      {/* ── Featured Games: the heading on the left, the shelf of game tiles on the right ──
          The section is where "Browse games" lands (tabIndex -1 lets it take focus);
          scroll-mt keeps it clear of the sticky navbar. */}
      <section
        id="featured"
        ref={featuredRef}
        tabIndex={-1}
        aria-labelledby="featured-title"
        className="mt-30 sm:mt-50 scroll-mt-20 sm:scroll-mt-34 lg:scroll-mt-24 focus:outline-none"
      >
        <div className={WRAP}>
          <div className="grid gap-y-10 items-start lg:grid-cols-[minmax(0,2fr)_minmax(0,10fr)] lg:gap-x-10 xl:gap-x-12">
            <div>
              <h2 id="featured-title" className={SECTION_TITLE}>
                Featured games
              </h2>
              <p className="mt-5 max-w-[280px] text-base leading-[1.6] text-white">
                The most popular recent releases, powered by IGDB.
              </p>

              {/* Carousel controls, as quiet text: only when there's more than one page */}
              {pageCount > 1 && (
                <nav aria-label="Featured games pages" className="flex items-center gap-x-6 mt-6 lg:mt-8">
                  <button type="button" onClick={() => goToPage(page - 1)} className={TEXT_BUTTON}>
                    Previous
                  </button>
                  <span aria-live="polite" className="text-sm tabular-nums text-slate-400">
                    <span className="sr-only">Page {page + 1} of {pageCount}</span>
                    <span aria-hidden="true">{page + 1} / {pageCount}</span>
                  </span>
                  <button type="button" onClick={() => goToPage(page + 1)} className={TEXT_BUTTON}>
                    Next
                  </button>
                </nav>
              )}
            </div>

            <div className="min-w-0">
              {error && <LoadError title="Couldn't load games right now" onRetry={retry} />}

              {/* key={page} gives each page a fresh shelf, so the fade-in replays. auto-fill
                  keeps tiles the same size on a last page with fewer games. Phones: 128px
                  tiles, so even a 320px screen fits two columns. */}
              <div
                key={page}
                className="grid grid-cols-[repeat(auto-fill,minmax(min(128px,100%),1fr))] gap-x-4 gap-y-9 sm:grid-cols-[repeat(auto-fill,minmax(min(160px,100%),1fr))] lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-x-6 sm:gap-y-13 animate-fade-in"
              >
                {games === null && !error && Array.from({ length: PAGE_SIZE }, (_, i) => <GameCardSkeleton key={i} />)}
                {pageGames.map((game) => (
                  <GameCard
                    key={game.id}
                    id={game.id}
                    title={game.title}
                    coverUrl={game.coverUrl}
                    genres={game.genres}
                    ratings={game.ratings}
                    reviewCount={game.reviewCount}
                    releaseDate={game.releaseDate}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What the community is saying, the game it picked this week (and the vote
          for next week's), and games waiting for their first review ── */}
      <FreshReviews reviews={freshReviews} />
      <GotwStrip />
      <ReviewPicks avoidArt={HERO_GAME_IDS} />
    </main>
  );
};

export default Home;
