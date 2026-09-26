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
import React, { useState, useEffect, useRef } from 'react';
import { mockGames } from '../utils/mockData';
import { getFeaturedGames } from '../lib/api';
import GameCard from '../components/GameCard';
import GameCardSkeleton from '../components/GameCardSkeleton';

const truncate = (text, max = 220) =>
  text && text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

const Home = () => {
  // Featured games from IGDB (via our backend). null = still loading.
  const [games, setGames] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // State to track which game is currently displayed in the background
  const [currentIndex, setCurrentIndex] = useState(0);

  const gridRef = useRef(null);

  // Fetch featured games once on mount; fall back to mock data if the API is unreachable
  useEffect(() => {
    const controller = new AbortController();

    getFeaturedGames(controller.signal)
      .then((data) => setGames(data.length > 0 ? data : mockGames))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.warn('Falling back to mock data — featured games request failed:', error);
        setGames(mockGames);
        setUsingFallback(true);
      });

    return () => controller.abort();
  }, []);

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
  const heroImage = currentGame?.artworks?.[0] ?? currentGame?.coverUrl;

  return (
    <>
    <main className="relative flex flex-col items-center justify-center h-[90vh] text-center px-4 overflow-hidden">
      
      {/* Rotating background layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
      >
        {/* Subtle dark gradient overlay so text stands out above the image */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
        <div className="absolute inset-0 bg-[#0B0F19]/40"></div>
      </div>

      {/* Home page content (sits above the background via z-10) */}
      <div className="relative z-10 flex flex-col items-center">
        <h2 className="text-7xl font-black mb-4 uppercase tracking-tighter drop-shadow-2xl text-white">
          I Am <span className="text-blue-500">Gaming.</span>
        </h2>
        
        <p className="text-2xl text-slate-200 mb-8 max-w-2xl font-light drop-shadow-md">
          The next-generation game database. 
        </p>

        {/* Small preview card for the currently featured game */}
        {currentGame && (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl mb-10 max-w-3xl text-left transform transition-all duration-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded uppercase">
                Trending Now
              </span>
              <h3 className="text-xl font-bold text-white">{currentGame.title}</h3>
            </div>
            {currentGame.aiSummary ? (
              <p className="text-slate-300 italic text-sm">
                <span className="font-semibold text-blue-400">AI Summary: </span>
                "{currentGame.aiSummary}"
              </p>
            ) : currentGame.description && (
              <p className="text-slate-300 text-sm">
                <span className="font-semibold text-blue-400">About: </span>
                {truncate(currentGame.description)}
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-full font-bold text-lg shadow-lg shadow-blue-500/40 transition transform hover:scale-105">
          Explore Games
        </button>
      </div>

    </main>

      {/* ── Featured Games Grid ── */}
      <section ref={gridRef} className="relative z-10 px-6 py-16 max-w-7xl mx-auto scroll-mt-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Featured <span className="text-blue-400">Games</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              The most popular recent releases, powered by IGDB
            </p>
          </div>
          {usingFallback && (
            <span className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
              Offline — showing sample data
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {games === null && Array.from({ length: 10 }, (_, i) => <GameCardSkeleton key={i} />)}
          {games?.map((game) => (
            <GameCard
              key={game.id}
              id={game.id}
              title={game.title}
              coverUrl={game.coverUrl}
              genres={game.genres}
              platforms={game.platforms}
              ratings={game.ratings}
              aiSentiment={game.aiSentiment}
              aiSummary={game.aiSummary}
              releaseDate={game.releaseDate}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default Home;
