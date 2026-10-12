/**
 * ui — the Noir class recipes that several pages share, so a link, a button or a
 * heading looks the same everywhere. Each one is a plain string of Tailwind classes:
 * add it to a className, with any extra classes after it.
 *
 *   WRAP            the page's width and side margins (the same as the header's)
 *   TEXT_LINK       the quiet text link: a soft underline that firms up on hover
 *   TEXT_BUTTON     the same, on a <button> with no box (TEXT_BUTTON_SM: 14px text)
 *   PRIMARY_BUTTON  the one lime action on a page ("Start your first quest")
 *   GHOST_BUTTON    every other button: a control-grey edge that turns ivory on hover
 *                   (GHOST_BUTTON_SM: 14px text; GHOST_BUTTON_TALL: 52px, to stand
 *                   beside a primary)
 *   SECTION_TITLE   a section's h2 (and most page h1s): Big Shoulders, 34px → 54px
 *   FIELD           a text field: card stock with a control-grey edge, ivory on focus
 *   TEXT_BOX        the same for a textarea (no fixed height)
 *   SEGMENTS        a row of choices with one picked (sort, filters, tabs), with
 *   segment(on)     the classes for each choice in it
 *   LABEL           a small label above a value, in sentence case ("Developer")
 *
 * Add classes that don't fight the recipe's own: a second height, padding, text size
 * or display on top of one of these wins or loses by Tailwind's CSS order, not by its
 * place in the className. That's why the sizes come as their own recipes.
 */

// The page's width and side margins: the header, footer and every wide page use these,
// so a page's left edge lines up with the logo
export const WRAP = 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12';

// At rest the underline is the control grey at 80%, which lands on the design's #5A5249
// over the page black: there, but quieter than the words
export const TEXT_LINK =
  'underline decoration-1 underline-offset-5 decoration-slate-500/80 hover:decoration-current hover:text-slate-50 transition-colors duration-120';

const TEXT_BUTTON_BASE = `h-11 p-0 bg-transparent font-medium text-white cursor-pointer ${TEXT_LINK}`;
export const TEXT_BUTTON = `${TEXT_BUTTON_BASE} text-base`;
export const TEXT_BUTTON_SM = `${TEXT_BUTTON_BASE} text-sm`;

// Flat lime with dark text, 52px tall, one line. Lime is only ever on one action per
// page, so only that action uses this.
export const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 h-13 px-7 rounded-sm bg-brand text-slate-950 font-semibold whitespace-nowrap transition-[filter] duration-120 hover:brightness-107 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100';

const GHOST_BASE =
  'inline-flex items-center justify-center gap-2 rounded-sm border border-slate-500 font-medium text-white whitespace-nowrap hover:border-white hover:text-slate-50 transition-colors duration-120 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-500';
export const GHOST_BUTTON = `${GHOST_BASE} h-11 px-4.5 text-base`;
export const GHOST_BUTTON_SM = `${GHOST_BASE} h-11 px-4 text-sm`;
export const GHOST_BUTTON_TALL = `${GHOST_BASE} h-13 px-7 text-base`;

export const SECTION_TITLE = 'font-display text-[34px] sm:text-[54px] leading-[.95] tracking-[.005em] text-white';

// 16px text, so phones don't zoom in when the field gets focus. The edge shows focus,
// so the field draws no outline of its own.
export const FIELD =
  'w-full h-11 px-3.5 rounded-sm bg-slate-950 border border-slate-500 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-white transition-colors duration-120';

export const TEXT_BOX =
  'w-full rounded-sm bg-slate-950 border border-slate-500 px-3.5 py-3 text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-white transition-colors duration-120';

// The picked choice is a block of ivory; the others are ivory words, split by hairlines.
// The row scrolls sideways if it can't fit, which would clip a focus ring drawn outside
// a choice, so the ring is drawn just inside it (dark on the ivory one).
export const SEGMENTS = 'inline-flex max-w-full overflow-x-auto border border-slate-600 rounded-sm';
export const segment = (on) =>
  `shrink-0 inline-flex items-center justify-center gap-1.5 min-h-11 px-4 text-sm font-semibold whitespace-nowrap not-first:border-l not-first:border-slate-600 transition-colors duration-120 focus-visible:outline-offset-[-4px] disabled:opacity-40 disabled:cursor-not-allowed ${
    on ? 'bg-white text-slate-950 focus-visible:outline-slate-950' : 'text-white hover:bg-slate-800'
  }`;

export const LABEL = 'text-sm text-slate-400';
