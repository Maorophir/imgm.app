/**
 * Logo — the IMGM brand: the power switch (also our favicon) + the "IMGM" wordmark,
 * set in the display face (Big Shoulders 800).
 * The header's power mark is lime, one of the only three things Noir paints lime. The
 * footer uses the smaller `quiet` version, all ivory, so the lime stays special.
 */

// The power switch on its own (inherits the text colour, so pass a colour class)
export const PowerIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className={className}>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <path d="M12 2v10" />
  </svg>
);

// Power mark + wordmark, side by side. No tile behind the mark: Noir draws it straight
// on the page. The header wordmark is 34px at every width, as in the design.
const Logo = ({ quiet = false }) => (
  <span className="inline-flex items-center gap-2.5">
    <PowerIcon className={`shrink-0 ${quiet ? 'w-4.5 h-4.5 text-white' : 'w-6 h-6 text-brand'}`} />
    <span
      className={`font-wordmark leading-none tracking-[0.03em] text-white ${
        quiet ? 'text-[21px]' : 'text-[34px]'
      }`}
    >
      IMGM
    </span>
  </span>
);

export default Logo;
