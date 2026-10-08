import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

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
import Welcome from './pages/Welcome';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import GamerTagGate from './components/GamerTagGate';
import ReviewQuest from './pages/ReviewQuest';
import GameGuide from './pages/GameGuide';
import { usePlayNextAccess } from './hooks/usePlayNextAccess';

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
// Play Next for players who may use it (everyone after launch, beta players before);
// everyone else is sent home as if the page didn't exist
function PlayNextRoute() {
  const { enabled, loading } = usePlayNextAccess();
  if (loading) return <div className="min-h-[70vh]" />;
  return enabled ? <GameGuide /> : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <div className="bg-slate-950 min-h-screen text-white font-sans">
        {/* Navbar renders on EVERY page — it's outside <Routes> */}
        <Navbar />

        {/* Only the matched route renders here. The gate sends logged-in users
            without a gamer tag to /welcome first. */}
        <GamerTagGate>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:id" element={<GameDetails />} />
          <Route path="/game/:id/review" element={<ReviewQuest />} />
          <Route path="/search" element={<Search />} />
          <Route path="/trending" element={<Trending />} />
          {/* Play Next: live locally; in production only beta players until launch */}
          <Route path="/play-next" element={<PlayNextRoute />} />
          <Route path="/guide" element={<Navigate to="/play-next" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/oauth-success" element={<OAuthSuccess />} />
          <Route path="/welcome" element={<Welcome />} />
        </Routes>
        </GamerTagGate>
      </div>
      {/* Vercel Web Analytics: visitors and page views, cookieless (only counts on Vercel) */}
      <Analytics />
    </Router>
  );
}

export default App;
