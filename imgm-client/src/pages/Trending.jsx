/**
 * Trending page — Will display trending/popular games.
 *
 * Currently a placeholder. In Phase 1 Step 2-3, we'll populate this
 * with GameCard components using mock data, and later connect it to
 * the backend API in Phase 3.
 *
 * Notice this component has no state, no side effects, no imports —
 * it's a "pure" component that just returns JSX. This is perfectly fine!
 * Keep components simple until they NEED to be complex.
 */
function Trending() {
  return (
    <div className="flex items-center justify-center h-[80vh] text-3xl text-slate-400">
      Trending Games Coming Soon...
    </div>
  );
}

export default Trending;
