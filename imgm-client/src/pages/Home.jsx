/**
 * Home page — The landing/hero section of IMGM.
 *
 * This is a "page component" — it represents an entire route ("/").
 * React Router will render this when the URL matches "/".
 *
 * Why it's in pages/ and not components/:
 * - Convention: "pages" = route-level (one per URL), "components" = reusable UI pieces.
 * - A page can USE components (e.g., GameCard), but a component shouldn't be a page.
 *
 * Why we use Tailwind classes instead of a separate CSS file:
 * - Co-location: styles live right next to the markup they affect.
 * - No naming conflicts: you never have to worry about class names colliding.
 * - Easy to scan: you can see exactly what an element looks like without jumping to another file.
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getFeaturedGames } from '../lib/api';
import GameCard from '../components/GameCard';
import GameCardSkeleton from '../components/GameCardSkeleton';
import LoadError from '../components/LoadError';
import { FreshReviews, NeedsReview } from '../components/home/FreshReviews';

const PAGE_SIZE = 10; // games per carousel page (2 rows on desktop)

const truncate = (text, max = 220) =>
  text && text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

const Home = () => {
  // Featured games from IGDB (via our backend). null = still loading.
  const [games, setGames] = useState(null);
  const [error, setError] = useState(false);
  // Bumping this number re-runs the fetch effect below ("Try again")
  const [attempt, setAttempt] = useState(0);

  // State to track which game is currently displayed in the background
  const [currentIndex, setCurrentIndex] = useState(0);
  // Which page of the Featured Games carousel is showing (0-based)
  const [page, setPage] = useState(0);

  const gridRef = useRef(null);

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

  const retry = () => {
    setError(false);
    setGames(null); // back to the loading skeleton
    setAttempt((n) => n + 1);
  };

  const gameCount = games?.length ?? 0;

  // Cycle to the next game every 10 seconds once games are loaded
  useEffect(() => {
    if (gameCount === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % gameCount);
    }, 10000);

    // Cleanup the interval on unmount to prevent memory leaks
    return () => clearInterval(interval);
  }, [gameCount]);

  const currentGame = gameCount > 0 ? games[currentIndex % gameCount] : null;

  // Carousel: slice out the games for the current page
  const pageCount = Math.ceil(gameCount / PAGE_SIZE);
  const pageGames = games?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  // Wrap around at the ends, like a carousel: last page → first, first → last
  const goToPage = (next) => setPage((next + pageCount) % pageCount);
  const heroImage = currentGame?.artworks?.[0] ?? currentGame?.coverUrl;

  // A one-line notice after leaving or confirming an email (the address says which)
  const [searchParams, setSearchParams] = useSearchParams();
  const notice = searchParams.get('goodbye') === '1'
    ? { title: 'Your account is deleted.', text: "Thanks for playing with us. You're always welcome back." }
    : searchParams.get('verified') === '1'
      ? { title: 'Email confirmed.', text: 'Welcome to IMGM, player one!' }
      : null;

  return (
    <>
      {notice && (
        <div role="status" className="relative z-20 max-w-3xl mx-auto mt-6 mx-4 md:mx-auto flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/90 px-5 py-4">
          <p className="text-slate-200">
            <span className="font-bold text-white">{notice.title}</span> {notice.text}
          </p>
          <button type="button" onClick={() => setSearchParams({})} className="text-sm font-bold text-slate-400 hover:text-white">Close</button>
        </div>
      )}
    <main className="relative flex flex-col items-center justify-center h-[90vh] text-center px-4 overflow-hidden">
      
      {/* Rotating background layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
      >
        {/* Subtle dark gradient overlay so text stands out above the image */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Home page content (sits above the background via z-10) */}
      <div className="relative z-10 flex flex-col items-center">
        {/* The logo's headline: heavy white letters, one lime full stop */}
        <h2 className="font-display text-7xl md:text-8xl mb-4 uppercase tracking-tight drop-shadow-2xl text-white">
          I Am Gaming<span className="text-brand drop-shadow-[0_0_18px_var(--color-brand)]">.</span>
        </h2>
        
        <p className="text-2xl text-slate-200 mb-8 max-w-2xl font-light drop-shadow-md">
          Rate what you play. Discover what's next. 
        </p>

        {/* Small preview card for the currently featured game */}
        {currentGame && (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl mb-10 max-w-3xl text-left transform transition-all duration-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 whitespace-nowrap bg-brand text-slate-950 text-xs font-bold px-2 py-1 rounded uppercase">
                Trending Now
              </span>
              <h3 className="text-xl font-bold text-white">{currentGame.title}</h3>
            </div>
            {currentGame.aiSummary ? (
              <p className="text-slate-300 italic text-sm">
                <span className="font-semibold text-white">AI Summary: </span>
                "{currentGame.aiSummary}"
              </p>
            ) : currentGame.description && (
              <p className="text-slate-300 text-sm">
                <span className="font-semibold text-white">About: </span>
                {truncate(currentGame.description)}
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="px-10 py-4 bg-brand hover:brightness-110 text-slate-950 rounded-full font-bold text-lg shadow-[0_8px_30px_-6px_var(--color-brand)] transition transform hover:scale-105">
          Explore Games
        </button>
      </div>

    </main>

      {/* ── Featured Games Grid ── */}
      <section ref={gridRef} className="relative z-10 px-6 py-16 max-w-7xl mx-auto scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Featured <span className="text-brand">Games</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              The most popular recent releases, powered by IGDB
            </p>
          </div>

          {/* Carousel controls — only when there's more than one page */}
          {pageCount > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => goToPage(page - 1)}
                aria-label="Previous games"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:text-brand hover:border-brand/60 hover:bg-brand/10 transition"
              >
                ←
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    aria-label={`Page ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${i === page ? 'w-6 bg-brand' : 'w-2 bg-slate-700 hover:bg-slate-500'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => goToPage(page + 1)}
                aria-label="Next games"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:text-brand hover:border-brand/60 hover:bg-brand/10 transition"
              >
                →
              </button>
            </div>
          )}
        </div>

        {error && <LoadError title="Couldn't load games right now" onRetry={retry} />}

        {/* key={page} gives each page a fresh grid, so the fade-in animation replays */}
        <div key={page} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 animate-fade-in">
          {games === null && !error && Array.from({ length: PAGE_SIZE }, (_, i) => <GameCardSkeleton key={i} />)}
          {pageGames.map((game) => (
            <GameCard
              key={game.id}
              id={game.id}
              title={game.title}
              coverUrl={game.coverUrl}
              genres={game.genres}
              platforms={game.platforms}
              ratings={game.ratings}
              reviewCount={game.reviewCount}
              aiSentiment={game.aiSentiment}
              aiSummary={game.aiSummary}
              releaseDate={game.releaseDate}
            />
          ))}
        </div>
      </section>

      {/* ── What the community is saying, and games waiting for their first review ── */}
      <FreshReviews />
      <NeedsReview games={games} />
    </>
  );
};

export default Home;
