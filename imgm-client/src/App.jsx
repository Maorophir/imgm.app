import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layout components
import Navbar from './components/Navbar';

// Page components (one per route)
import Home from './pages/Home';
import Trending from './pages/Trending';
import Profile from './pages/Profile';
import GameDetails from './pages/GameDetails';
import Auth from './pages/Auth';
import OAuthSuccess from './pages/OAuthSuccess';
import Search from './pages/Search';

/**
 * App — The root component. Its ONLY job is:
 * 1. Provide the Router context (so <Link> and useNavigate work everywhere)
 * 2. Render the global layout (Navbar + page wrapper)
 * 3. Define which page component renders for each URL
 *
 * Notice what's NOT here anymore:
 * - No page JSX (moved to pages/)
 * - No inline component definitions
 * - No CSS import (Tailwind is loaded globally via index.css)
 * - No useState (App itself has no state — pages manage their own)
 *
 * This pattern is called "layout composition" — the App composes the
 * overall page structure, and each route fills in the content area.
 */
function App() {
  return (
    <Router>
      <div className="bg-slate-950 min-h-screen text-white font-sans">
        {/* Navbar renders on EVERY page — it's outside <Routes> */}
        <Navbar />

        {/* Only the matched route renders here */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:id" element={<GameDetails />} />
          <Route path="/search" element={<Search />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/oauth-success" element={<OAuthSuccess />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
