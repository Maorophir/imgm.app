/**
 * Footer — a quiet line at the bottom of every page (not on Play Next, whose chat
 * fills the screen): privacy, feedback, and that IMGM is in beta.
 */
import { Link, useLocation } from 'react-router-dom';
import { openFeedback } from './Feedback';

const Footer = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/play-next')) return null;
  return (
    <footer className="border-t border-slate-800/80 mt-10">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <p>IMGM · I Am Gaming <span className="text-slate-600">· beta</span></p>
        <nav className="flex gap-5">
          <Link to="/terms" className="hover:text-white transition">Terms</Link>
          <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
          <button type="button" onClick={openFeedback} className="hover:text-white transition">Send feedback</button>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
