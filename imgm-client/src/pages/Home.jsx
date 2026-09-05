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
import React, { useState, useEffect } from 'react';
import { mockGames } from '../utils/mockData';
import GameCard from '../components/GameCard';


const Home = () => {
  // State to track which game is currently displayed in the background
  const [currentIndex, setCurrentIndex] = useState(0);

  // Effect that runs once on mount — starts a timer that cycles to the next game every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % mockGames.length);
    }, 10000);
    
    // Cleanup the interval on unmount to prevent memory leaks
    return () => clearInterval(interval);
  }, []);

  const currentGame = mockGames[currentIndex];

  return (
    <>
    <main className="relative flex flex-col items-center justify-center h-[90vh] text-center px-4 overflow-hidden">
      
      {/* Rotating background layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url(${currentGame.artworks[0]})` }}
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

        {/* Small AI preview card for the currently featured game */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl mb-10 max-w-3xl text-left transform transition-all duration-500">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded uppercase">
              Trending Now
            </span>
            <h3 className="text-xl font-bold text-white">{currentGame.title}</h3>
          </div>
          <p className="text-slate-300 italic text-sm">
            <span className="font-semibold text-blue-400">AI Summary: </span> 
            "{currentGame.aiSummary}"
          </p>
        </div>

        <button className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-full font-bold text-lg shadow-lg shadow-blue-500/40 transition transform hover:scale-105">
          Explore Games
        </button>
      </div>

    </main>

      {/* ── Featured Games Grid ── */}
      <section className="relative z-10 px-6 py-16 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">
              Featured <span className="text-blue-400">Games</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Curated picks powered by community reviews & AI insights
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {mockGames.map((game) => (
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
