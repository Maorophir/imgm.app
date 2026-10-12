/**
 * Footer — a quiet line at the bottom of every page (not on Play Next, whose chat
 * fills the screen): the brand, that IMGM is in beta, Terms, Privacy and feedback.
 * Noir: one hairline on top, metadata-grey text, the power mark in ivory (the lime
 * one lives in the header).
 */
import { Link, useLocation } from 'react-router-dom';
import { openFeedback } from './Feedback';
import Logo from './Logo';
import { WRAP } from '../lib/ui';

// Quiet grey links that light up ivory and underline on hover
const linkClass =
  'inline-flex items-center h-11 whitespace-nowrap text-sm text-slate-400 hover:text-slate-50 underline underline-offset-4 decoration-transparent hover:decoration-current transition-colors duration-120';

const Footer = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/play-next')) return null;
  return (
    // Pages keep their own bottom padding, so this margin plus theirs makes the wide
    // gap the design leaves above the footer
    <footer className="mt-12 md:mt-16 border-t border-slate-700">
      <div className={`${WRAP} pt-6 pb-10 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4`}>
        <p className="flex items-center gap-2.5 text-sm text-slate-400">
          <Logo quiet />
          <span>I Am Gaming · beta</span>
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-7">
            <li><Link to="/terms" className={linkClass}>Terms</Link></li>
            <li><Link to="/privacy" className={linkClass}>Privacy</Link></li>
            <li><button type="button" onClick={openFeedback} className={linkClass}>Send feedback</button></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
