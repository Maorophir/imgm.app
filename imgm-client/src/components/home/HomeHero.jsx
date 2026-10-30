/**
 * HomeHero — the top of the home page: the title, what IMGM is, the way in, and a real
 * card that shows it.
 *
 *   The title    "I am gaming." in condensed capitals with the lime full stop, on one
 *                line at every size (the page's h1)
 *   The promise  "Play it. Rate it. Collect it." under it, and a quieter line that
 *                says what that means: every rating becomes a collectible card
 *   The way in   the one lime button, "Rate a game you played" (it asks which game you
 *                played last), with a small line under it: about two minutes, and the
 *                score sets the card's rarity. "Browse games" scrolls down to the
 *                featured games.
 *   Play Next    under that, a small panel with a sample request and its 5 picks, so a
 *                visitor knows at once what Play Next is (one line on phones)
 *   The card     hand-picked top games (lib/homeShowcase), taking turns: each a trading
 *                card in its share edition (the words and the IMGM mark on the card),
 *                standing on its game's key art. It tilts toward the pointer and turns
 *                over (to its checklist, like a game page's card) with Flip.
 *   The carousel every 6 seconds the card turns over to IMGM's back and comes up as the
 *                next game, and the key art behind it fades to that game's. It waits
 *                while the pointer or keyboard focus is on the card or its buttons,
 *                while its back is shown, and while the tab is hidden; the dots pick a
 *                game. People who ask for less motion get no turning by itself.
 *
 * The key art is the hero's backdrop: edge to edge, from right under the navbar (behind
 * the big title too, no black strip between) down to under the card, fading out into
 * the page below, darkened so the words over it stay readable.
 *
 * The band always shows the shown card's own game, and the caption under it names that
 * game with its live IMGM numbers. With no cards to show, the card lies face down.
 *
 * Layout: one grid, so the card can sit across the band, sized so the card is seen
 * without scrolling. On desktop the title spans the top, the words sit left and the
 * card stands in its own column from beside the title down, with Flip and the dots
 * under it on the band's bottom edge; the card and its buttons fit a 1280×800 screen. The band's last
 * row only needs to hold the Play Next panel, which floats under the words. On tablets and phones it all stacks: title, words, then the
 * card centred over the band, with its buttons and the caption below. Phones keep
 * "Browse games" for the end of the hero, so the card's title, score and art are on
 * the first screen.
 *
 * Props:
 *   slides    the cards, in order ([{ review, card, band }], lib/homeShowcase heroes):
 *             review { id, rating, game, checklist } (id null = a sample: no Share or
 *             "Read the review"), card (CollectibleCard props, with its quote), band
 *             (the game whose key art fills the band: { id, title, artworks, developer,
 *             releaseDate, artLabel: 'Screenshot' when it isn't key art, artPosition:
 *             which part of the picture shows, when not the usual 50% 35%) })
 *   stats     the games' live IMGM numbers by id ({ ratings: { imgm }, reviewCount })
 *   onBrowse  click handler for "Browse games" (scrolls to the featured games)
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CardStage from '../CardStage';
import CollectibleCard, { CardBack, ChecklistBack } from '../CollectibleCard';
import { tickedChecklist } from '../reviewCard/reviewDisplay';
import ShareCardButton from '../ShareCardButton';
import GameVerdictLink from './GameVerdictLink';
import FaceDownCard from './FaceDownCard';
import { getRarity } from '../reviewQuest/questOptions';
import { artSrcSet } from '../../lib/igdbImage';
import { TEXT_LINK, TEXT_BUTTON, PRIMARY_BUTTON } from '../../lib/ui';
import PlayNextTeaser from './PlayNextTeaser';
import FlipIcon from '../reviewCard/FlipIcon';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

// The key art behind the hero ("the band"): from the top of the hero (its negative
// margin cancels the section's top padding, so the art meets the navbar) down to the
// row the card stands in (row 4), whose height steps down with the screen (see the
// section's classes); short laptop screens (850px tall or less: 1280×800, 1366×768) get
// a lower one, so the card still ends inside the first screen. It fades out into the
// page at the bottom.
const BAND = 'col-span-full row-start-1 row-end-5 -mt-5 sm:-mt-8 lg:-mt-10 relative z-1 overflow-hidden';
// The shades over the art: phones and tablets darken it evenly (the words run across
// it); desktop darkens the left, under the words, and leaves the right to the art
const BAND_SHADES = [
  'bg-slate-950/45 lg:bg-transparent lg:bg-gradient-to-r lg:from-slate-950/85 lg:via-slate-950/40 lg:to-slate-950/5',
  // A light shade at the top, for the title: the art still shows right up to the navbar
  'bg-gradient-to-b from-slate-950/55 via-transparent via-30% to-transparent',
  'bg-gradient-to-t from-slate-950 via-transparent via-30% to-transparent',
];

// How long each card shows (time to read its words), and how long turning over takes
// (the flip's 0.7s in index.css)
const SHOW_MS = 6000;
const TURN_MS = 700;

// "Browse games": a real link to the section (it works without the scroll, and in a
// new tab), but the page scrolls itself: a plain #link would count as a new page
const BROWSE = `items-center justify-center min-h-11 text-base font-medium text-white ${TEXT_LINK}`;

const HomeHero = ({ slides = [], stats = {}, onBrowse }) => {
  const count = slides.length;
  const [shown, setShown] = useState(0);
  // Showing the card's back ("Flip"): the reviewer's checklist if they filled
  // one in, otherwise the back every IMGM card shares
  const [flipped, setFlipped] = useState(false);
  const [turning, setTurning] = useState(false); // on IMGM's back, between two games
  const [held, setHeld] = useState(false); // the pointer or focus is on the card or its buttons
  const reduced = usePrefersReducedMotion();
  const turnTimer = useRef(null);

  const slide = slides[shown] ?? null;
  const review = slide?.review ?? null;
  const card = slide?.card ?? null;
  const bandGame = slide ? { ...slide.band, ...stats[slide.band.id] } : null;
  const ticks = review?.checklist ? tickedChecklist(review.checklist) : [];

  // Turns the card over to IMGM's back, and brings it up as card `next`
  const goTo = (next) => {
    clearTimeout(turnTimer.current);
    setFlipped(false);
    if (reduced) {
      setShown(next);
      return;
    }
    setTurning(true);
    turnTimer.current = setTimeout(() => {
      setShown(next);
      setTurning(false);
    }, TURN_MS);
  };
  useEffect(() => () => clearTimeout(turnTimer.current), []);

  // The carousel turning by itself: never for less motion, and not while it's held or
  // its back is being read
  useEffect(() => {
    if (count < 2 || reduced || held || flipped) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') goTo((shown + 1) % count);
    }, SHOW_MS);
    return () => clearInterval(timer);
    // goTo only reads what's listed here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, reduced, held, flipped, shown]);

  // The next card's cover and key art load ahead, so it never turns up blank
  useEffect(() => {
    const next = slides[(shown + 1) % count];
    if (!next || count < 2) return;
    new Image().src = next.card.coverUrl;
    const art = new Image();
    art.sizes = '100vw';
    art.srcset = artSrcSet(next.band.artworks[0]);
    art.src = next.band.artworks[0];
  }, [slides, shown, count]);

  // The card and its buttons hold the carousel still while they're in use
  const hold = {
    onPointerEnter: () => setHeld(true),
    onPointerLeave: () => setHeld(false),
    onFocus: () => setHeld(true),
    onBlur: () => setHeld(false),
  };

  const rarity = review ? getRarity(review.rating) : null;
  // Opens the game page right at this review. A showcase card (id null) is a sample, not
  // a real review: it has nothing to share or open, so it links to its game instead.
  const sample = review && !review.id;
  const reviewLink = review && !sample ? `/game/${review.game.id}?review=${review.id}#review-${review.id}` : null;

  // IGDB dates are midnight UTC, so the year is read in UTC (not the visitor's time zone)
  const bandYear = bandGame?.releaseDate ? new Date(bandGame.releaseDate).getUTCFullYear() : null;
  const artCredit = bandGame ? [bandGame.developer, bandYear].filter(Boolean).join(', ') || bandGame.title : '';

  return (
    // Columns: a gutter, the words, the card, a gutter (desktop); a gutter, everything,
    // a gutter (tablets, phones). Rows: title, words, a gap the card reaches into, the
    // band, then the buttons and the caption (and on phones, "Browse games").
    // Desktop: the words column's width plus the card's 330px (300px on small laptops)
    // makes the same width as the page's other sections, so the edges line up.
    <section
      aria-labelledby="home-title"
      className="grid pt-5 grid-cols-[16px_minmax(0,1fr)_16px] grid-rows-[auto_auto_88px_300px_auto_auto_auto] sm:pt-8 sm:grid-cols-[24px_minmax(0,1fr)_24px] sm:grid-rows-[auto_auto_104px_360px_auto_auto] lg:pt-10 lg:grid-cols-[minmax(32px,1fr)_minmax(0,940px)_300px_minmax(32px,1fr)] lg:grid-rows-[auto_auto_32px_260px_auto] lg:short:grid-rows-[auto_auto_32px_260px_auto] xl:grid-cols-[minmax(48px,1fr)_minmax(0,1014px)_330px_minmax(48px,1fr)] xl:grid-rows-[auto_auto_32px_256px_auto] xl:short:grid-rows-[auto_auto_32px_256px_auto]"
    >
      {/* The logo's headline: heavy ivory capitals, one lime full stop. The page's h1 (its
          main headline for search engines). One line everywhere: it is about 5.4em
          wide, so 15vw leaves room to spare even on a 320px phone. Desktop sets it
          smaller (8vw) so the card under it fits on the screen. */}
      <h1
        id="home-title"
        className="col-start-2 row-start-1 lg:col-end-4 relative z-5 font-display uppercase tracking-[.005em] text-white text-[length:clamp(40px,15vw,128px)] leading-[.82] lg:text-[length:clamp(80px,8vw,136px)] lg:leading-[.8]"
      >
        I Am Gaming<span className="text-brand">.</span>
      </h1>

      {/* ── What IMGM is, and the way in ── */}
      <div className="col-start-2 row-start-2 relative z-5 min-w-0 pt-4 sm:pt-6 lg:pr-12 xl:pr-16">
        {/* The promise, plainly. From tablets up each sentence gets its own line; phones
            let the two run together, balanced over three lines. */}
        <p className="text-[24px] leading-[1.2] font-semibold text-white text-balance sm:text-[28px] xl:text-[32px]">
          Play it. Rate it. Collect it.
        </p>
        <p className="mt-2 text-base text-slate-300 sm:text-lg">Every rating becomes a collectible card.</p>

        <div className="mt-6 flex flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3 lg:mt-8">
          {/* The page's one primary action, so it's the one lime button. It asks which
              game you played last (Search's quest mode) and opens that game's quest. */}
          <Link to="/search?quest=1" className={PRIMARY_BUTTON}>
            Rate a game you played
          </Link>
          {/* Beside the button from tablets up (phones: at the end of the hero) */}
          <a href="#featured" onClick={onBrowse} className={`hidden sm:inline-flex ${BROWSE}`}>
            Browse games
          </a>
        </div>
        <p className="mt-3 text-sm text-slate-400">About two minutes. Your score sets the card’s rarity.</p>

        {/* What Play Next is, at a glance (only for visitors who may use it) */}
        <PlayNextTeaser />
      </div>

      {/* ── The card, standing over the band and hanging past its bottom edge ── */}
      <div {...hold} className="col-start-2 row-start-3 row-end-5 self-end justify-self-center relative z-3 min-w-0 w-[min(260px,100%)] -mb-12 sm:w-[min(300px,100%)] sm:-mb-14 lg:col-start-3 lg:row-start-1 lg:justify-self-stretch lg:w-auto lg:mb-[96px]">
        {review ? (
          <CardStage
            tier={rarity.key}
            flipped={flipped || turning}
            // The share edition: the player's words and the IMGM mark on the card itself
            front={<CollectibleCard {...card} edition="share" />}
            // Between two games it's IMGM's back; Flip shows the checklist
            back={!turning && ticks.length > 0 ? <ChecklistBack score={review.rating} ticks={ticks} name={card.reviewer} /> : <CardBack />}
          />
        ) : (
          // Still loading, or nothing to show: a card face down (never a made-up one)
          <FaceDownCard className="rotate-[-2.5deg]" />
        )}
      </div>

      {/* ── The band: a game's key art behind the hero (nothing until it's known). It's
          the largest picture on the first screen, so it loads first and never lazily;
          the browser picks the 1280px or the 1920px copy for the screen. ── */}
      <div className={BAND}>
        {bandGame && (
          <img
            key={bandGame.artworks[0]} // a new game's art fades in
            src={bandGame.artworks[0]}
            srcSet={artSrcSet(bandGame.artworks[0])}
            sizes="100vw"
            alt={`${bandGame.title} key art`}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-[50%_35%] animate-fade-in"
            style={bandGame.artPosition ? { objectPosition: bandGame.artPosition } : undefined}
          />
        )}
        {BAND_SHADES.map((shade) => (
          <div key={shade} aria-hidden="true" className={`absolute inset-0 ${shade}`} />
        ))}
      </div>

      {/* ── What you can do with the card: under it (desktop: on the art's bottom edge) ── */}
      <div {...hold} className={`col-start-2 row-start-5 lg:col-start-3 lg:row-start-4 lg:self-end relative z-6 min-w-0 flex flex-wrap items-center justify-center gap-x-5 pt-[60px] sm:gap-x-6 sm:pt-[72px] lg:pt-0 ${sample ? '' : 'lg:justify-start'}`}>
        {review ? (
          <>
            {!sample && (
            <ShareCardButton
              url={reviewLink}
              title={`${card.reviewer}’s card for ${review.game.title}`}
              text={`${review.rating}/10, ${rarity.label} on IMGM`}
              card={card}
            />
            )}
            <button
              type="button"
              onClick={() => setFlipped((turned) => !turned)}
              // Screen readers hear what's on the other side (the card itself is a picture to them)
              aria-label={flipped ? 'Flip back to the front' : ticks.length > 0 ? 'Flip to see the checklist' : 'Flip'}
              className={`inline-flex items-center gap-2 ${TEXT_BUTTON}`}
            >
              <span>{flipped ? 'Flip back' : 'Flip'}</span>
              <FlipIcon flipped={flipped} />
            </button>
            {/* A showcase card only turns over (the caption links to its game) */}
            {!sample && (
              <Link to={reviewLink} className={`inline-flex items-center h-11 text-base font-medium text-white ${TEXT_LINK}`}>
                Read the review
              </Link>
            )}
            {/* One dot per card, on their own line under Flip: the shown one is a longer
                ivory bar (lime is the page's one main action), and each is a 44px tap target */}
            {count > 1 && (
              <span className={`basis-full flex justify-center ${sample ? '' : 'lg:justify-start'}`}>
                {slides.map((item, i) => (
                  <button
                    key={item.band.id}
                    type="button"
                    onClick={() => i !== shown && goTo(i)}
                    aria-label={`Show ${item.card.title}`}
                    aria-current={i === shown ? 'true' : undefined}
                    className="group grid place-items-center h-11 w-7"
                  >
                    <span
                      className={`block h-1 rounded-full transition-all duration-300 ${
                        i === shown ? 'w-5 bg-white' : 'w-2 bg-slate-600 group-hover:bg-slate-400'
                      }`}
                    />
                  </button>
                ))}
              </span>
            )}
          </>
        ) : null}
      </div>

      {/* ── The caption: whose art the band is, and that game's IMGM verdict ── */}
      {bandGame && (
        <div className="col-start-2 row-start-6 lg:row-start-5 min-w-0 flex flex-wrap items-center justify-between gap-x-8 pt-2 lg:pt-3 lg:pr-12 xl:pr-16">
          <GameVerdictLink game={bandGame} />
          <p className="flex items-center min-h-11 text-sm text-slate-400">{bandGame.artLabel ?? 'Key art'} · {artCredit}</p>
        </div>
      )}

      {/* ── Phones: "Browse games" at the end of the hero, so the words above the card
          stay short enough for the card's art to show on the first screen ── */}
      <div className="col-start-2 row-start-7 pt-2 sm:hidden">
        <a href="#featured" onClick={onBrowse} className={`inline-flex ${BROWSE}`}>
          Browse games
        </a>
      </div>
    </section>
  );
};

export default HomeHero;
