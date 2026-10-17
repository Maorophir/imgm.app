/**
 * Lightbox — a screenshot shown big over the whole page, on a near-black backdrop.
 * ← → (or the arrow buttons) browse, Esc or a click outside the picture closes it, and
 * the page behind it doesn't scroll while it's open.
 *
 * Props:
 *   images    the screenshots' full-size addresses
 *   index     the one showing
 *   onChange  called with the next index (or a function of the current one)
 *   onClose   called to close it
 */
import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

const Lightbox = ({ images, index, onChange, onClose }) => {
  const go = (step) => onChange((index + step + images.length) % images.length);

  // Keyboard: ← → to browse, Esc to close. Also stop the page scrolling behind it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onChange((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') onChange((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [images.length, onChange, onClose]);

  // Square ghost buttons on card stock
  const iconButton =
    'absolute w-11 h-11 grid place-items-center rounded-sm bg-slate-900 border border-slate-500 text-white hover:border-white transition-colors duration-120';
  const arrow = `${iconButton} top-1/2 -translate-y-1/2`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Screenshot ${index + 1} of ${images.length}`}
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-slate-950/95 flex items-center justify-center p-4 animate-fade-in"
    >
      <img
        src={images[index]}
        alt={`Screenshot ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] rounded-sm object-contain"
      />
      <button type="button" onClick={onClose} aria-label="Close" className={`${iconButton} top-4 right-4`}>
        <X className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Previous screenshot" className={`${arrow} left-3 sm:left-6`} onClick={(e) => { e.stopPropagation(); go(-1); }}>
            <ArrowLeft className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next screenshot" className={`${arrow} right-3 sm:right-6`} onClick={(e) => { e.stopPropagation(); go(1); }}>
            <ArrowRight className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-slate-300 tabular-nums">
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
};

export default Lightbox;
