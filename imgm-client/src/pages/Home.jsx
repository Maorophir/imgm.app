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
function Home() {
  return (
    <main className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
      <h2 className="text-6xl font-black mb-6 uppercase tracking-tight">
        I Am <span className="text-purple-500">Gaming.</span>
      </h2>
      <p className="text-xl text-gray-400 mb-10 max-w-2xl">
        The next-generation game database. Discover titles, share your thoughts,
        and let AI summarize the community sentiment.
      </p>
      <button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-full font-bold text-lg shadow-lg shadow-purple-500/30 transition transform hover:scale-105">
        Explore Games
      </button>
    </main>
  );
}

export default Home;
