import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// Layout components
import Navbar from './components/Navbar';

// Page components (one per route)
import Home from './pages/Home';
import Profile from './pages/Profile';
import PlayerProfile from './pages/PlayerProfile';
import GameDetails from './pages/GameDetails';
import Auth from './pages/Auth';
import OAuthSuccess from './pages/OAuthSuccess';
import GameOfTheWeek from './pages/GameOfTheWeek';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import BackToTop from './components/BackToTop';
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';
import Feedback from './components/Feedback';
import Settings from './pages/Settings';
import Backlog from './pages/Backlog';
import { BacklogProvider } from './context/BacklogContext';
import TopGames from './pages/TopGames';
import Search from './pages/Search';
import Welcome from './pages/Welcome';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import GamerTagGate from './components/GamerTagGate';
import ReviewQuest from './pages/ReviewQuest';
import GameGuide from './pages/GameGuide';
import SteamLanding from './pages/SteamLanding';
import SteamLibrary from './pages/SteamLibrary';
import SteamSignUp from './pages/SteamSignUp';
import Discover from './pages/Discover';
import { usePlayNextAccess } from './hooks/usePlayNextAccess';
import { usePageTitle } from './hooks/usePageTitle';
import { useSearchIndexing } from './hooks/useSearchIndexing';

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

// Each page's title and description (the tab, and Google's headline + grey line).
// Game pages set their own, with the game's name and its IMGM numbers, and so do
// players' profiles (/u/<gamer tag>), which also decide whether Google may index them.
const PAGES = {
  '/hall-of-fame': [
    'Hall of Fame: the best games, rated by players',
    'The best games of all time, ranked by what IMGM players gave them. Filter by PC, PlayStation, Xbox or Switch.',
  ],
  '/game-of-the-week': [
    'Game of the Week',
    'Every week IMGM players vote on six games, and the winner reigns as Game of the Week. See this week\'s ballot and cast your vote.',
  ],
  '/play-next': [
    'Play Next: find your next game',
    'Answer a few questions and Play Next digs through your reviews and the IMGM community to pick 5 games you\'ll love, with a Best Pick.',
  ],
  '/steam': [
    'Connect your Steam library',
    'Connect Steam to see every game you own on IMGM, with your hours. Rate one in about two minutes, and it becomes a card.',
  ],
  '/steam/library': ['Your Steam library'],
  '/backlog': ['Your Backlog'],
  '/profile': ['Your profile'],
  '/settings': ['Settings'],
  '/search': ['Search games', 'Find any game and see what IMGM players think of it.'],
  '/terms': ['Terms of Use', 'The rules for using IMGM (I Am Gaming).'],
  '/privacy': ['Privacy Policy', 'What IMGM collects, why, and how to delete your account and data.'],
  '/login': ['Log in or sign up', 'Join IMGM to rate the games you play, collect a card for every rating, and get picks from Play Next.'],
  '/welcome': ['Welcome'],
  '/signup/steam': ['Sign up with Steam'],
  '/discover': ['Discover new games'],
};
function RouteTitle() {
  const { pathname } = useLocation();
  const onGamePage = pathname.startsWith('/game/');
  const [title, description] = (!onGamePage && PAGES[pathname]) || [];
  usePageTitle(title, description);
  useSearchIndexing(pathname); // canonical address, or noindex for private pages
  return null;
}

function App() {
  return (
    <Router>
      <BacklogProvider>
      <div className="bg-slate-950 min-h-screen text-white font-sans">
        {/* Navbar renders on EVERY page — it's outside <Routes> */}
        <Navbar />
        <RouteTitle />
        <ScrollToTop />

        {/* Only the matched route renders here. The gate sends logged-in users
            without a gamer tag to /welcome first. */}
        <GamerTagGate>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:id" element={<GameDetails />} />
          <Route path="/game/:id/review" element={<ReviewQuest />} />
          <Route path="/search" element={<Search />} />
          <Route path="/hall-of-fame" element={<TopGames />} />
          <Route path="/top" element={<Navigate to="/hall-of-fame" replace />} />
          <Route path="/game-of-the-week" element={<GameOfTheWeek />} />
          {/* Trending is hidden until it has real content: old links go home */}
          <Route path="/trending" element={<Navigate to="/" replace />} />
          {/* Play Next: live locally; in production only beta players until launch */}
          <Route path="/play-next" element={<PlayNextRoute />} />
          <Route path="/guide" element={<Navigate to="/play-next" replace />} />
          <Route path="/profile" element={<Profile />} />
          {/* Anyone's public profile, by gamer tag */}
          <Route path="/u/:username" element={<PlayerProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/backlog" element={<Backlog />} />
          {/* Steam: what connecting gives you (anyone), then your library (players) */}
          <Route path="/steam" element={<SteamLanding />} />
          <Route path="/steam/library" element={<SteamLibrary />} />
          {/* Discover: a feed of new games, one per screen (a demo for now) */}
          <Route path="/discover" element={<Discover />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Auth />} />
          {/* Back from Steam to sign up: the email step */}
          <Route path="/signup/steam" element={<SteamSignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/oauth-success" element={<OAuthSuccess />} />
          <Route path="/welcome" element={<Welcome />} />
        </Routes>
        </GamerTagGate>
        <Footer />
        <BackToTop />
        <Feedback />
      </div>
      </BacklogProvider>
      {/* Vercel Web Analytics: visitors and page views, cookieless (only counts on Vercel) */}
      <Analytics />
    </Router>
  );
}

export default App;
