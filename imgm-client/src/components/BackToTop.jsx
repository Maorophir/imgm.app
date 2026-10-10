/**
 * BackToTop — a small round "↑" button that appears once you've scrolled a long way
 * down, and glides you back to the top. Sits above the Feedback button; not on Play
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
      className="fixed bottom-[4.75rem] right-5 z-40 w-12 h-12 sm:w-11 sm:h-11 rounded-full grid place-items-center bg-slate-900/95 border border-slate-700 text-slate-200 shadow-xl shadow-black/40 hover:text-white hover:border-brand/60 transition animate-fade-in"
    >
      <ArrowUp className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};

export default BackToTop;
