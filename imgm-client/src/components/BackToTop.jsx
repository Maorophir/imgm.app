/**
 * BackToTop — a small square arrow button (a ghost, like the Feedback one) that
 * appears once you've scrolled a long way down, and glides you back to the top. Sits above the Feedback button; not on Play
 * Next, whose chat scrolls inside its own panel.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

const SHOW_AFTER = 900; // px scrolled

const BackToTop = () => {
  const location = useLocation();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const check = () => setShown(window.scrollY > SHOW_AFTER);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  if (!shown || location.pathname.startsWith('/play-next')) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to the top"
      title="Back to the top"
      className="fixed bottom-[4.5rem] right-5 z-40 w-11 h-11 rounded-sm grid place-items-center bg-slate-900 border border-slate-500 text-white hover:border-white hover:text-slate-50 transition-colors duration-120 animate-fade-in"
    >
      <ArrowUp className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
};

export default BackToTop;
