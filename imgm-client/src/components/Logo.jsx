/**
 * The IMGM brand: the lime power switch (also our favicon) + the "IMGM" wordmark.
 * Lime is reserved for the brand — the rest of the site stays white on black.
 */

// The power switch on its own (inherits the text colour, so pass a colour class)
export const PowerIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" className={className}>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <path d="M12 2v10" />
  </svg>
);

// Icon tile + wordmark, as in the logo
const Logo = () => (
  <span className="flex items-center gap-3">
    <span className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 grid place-items-center">
      <PowerIcon className="w-5 h-5 text-brand" />
    </span>
    <span className="font-wordmark text-xl font-bold tracking-[0.3em] text-white">IMGM</span>
  </span>
);

export default Logo;
