/**
 * HomeHero — the top of the home page: the title, what IMGM is, the way in, and a real
 * card that shows it.
 *
 *   The title    "I am gaming." in condensed capitals with the lime full stop, on one
 *                line at every size (the page's h1)
 *   The promise  one plain sentence under it: players rate games, every rating becomes
 *                a collectible card
 *   The way in   the one lime button, "Rate a game you played" (it asks which game you
 *                played last), with a small line under it: about two minutes, and the
 *                score sets the card's rarity. "Browse games" scrolls down to the
 *                featured games.
 *   The card     a recent review with the player's words (the Home page picks it: the
 *                owner's pinned one, else the best one with words to quote) as a trading
 *                card, laid across a full-width band of a game's key art. It tilts
 *                toward the pointer, turns over, and its link can be shared.
 *
 * Everything on it is real. The band shows the card's own game (its key art comes with
 * the review); only when that game has no art does it show a featured game's art, and
 * then the caption under it names that game. With no review to show yet, the card lies
 * face down and invites the first one.
 *
 * Layout: one grid, so the card can sit across the band, sized so the card is seen
 * without scrolling. On desktop the title spans the top, the words sit left and the
 * card stands in its own column, hanging over the band's bottom edge; the whole card
 * fits a 1280×800 screen. On tablets and phones it all stacks: title, words, then the
 * card centred over the band, with its buttons and the caption below. Phones keep
 * "Browse games" for the end of the hero, so the card's title, score and art are on
 * the first screen.
 *
 * Props:
 *   review    the review on show ({ id, rating, author, createdAt, game }), or null
 *   card      its CollectibleCard props, with its quote (built by the Home page)
 *   loading   true while the recent reviews are still on their way
 *   failed    true when the recent reviews couldn't be loaded: the card stays face
 *             down, without the "no cards yet" line (that wouldn't be true)
 *   bandGame  the game whose key art fills the band ({ title, artworks, developer,
 *             releaseDate, ratings, reviewCount }), or null
 *   onBrowse  click handler for "Browse games" (scrolls to the featured games)
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import CardStage from '../CardStage';
import CollectibleCard, { CardBack } from '../CollectibleCard';
import RarityMark from '../RarityMark';
import ShareCardButton from '../ShareCardButton';
import FaceDownCard from './FaceDownCard';
import { getRarity } from '../reviewQuest/questOptions';
import { artSrcSet } from '../../lib/igdbImage';
import { TEXT_LINK, TEXT_BUTTON, PRIMARY_BUTTON } from '../../lib/ui';

// The band of key art, edge to edge. Its height steps down with the screen; the grid
// row it sits in (see the section's classes) has the same height. Desktop gets a lower
// band than tablets: the title and the words sit above it there, and the card that
// hangs off its bottom edge still has to end inside an 800px-tall screen.
const BAND =
  'col-span-full row-start-4 relative z-1 block w-full h-[300px] sm:h-[360px] lg:h-[260px] xl:h-[280px] object-cover object-[50%_40%] bg-slate-900';

// "Browse games": a real link to the section (it works without the scroll, and in a
// new tab), but the page scrolls itself: a plain #link would count as a new page
const BROWSE = `items-center justify-center min-h-11 text-base font-medium text-white ${TEXT_LINK}`;

const HomeHero = ({ review, card, loading, failed, bandGame, onBrowse }) => {
  // Showing the card's back ("Turn over")
  const [flipped, setFlipped] = useState(false);

  const rarity = review ? getRarity(review.rating) : null;
  // Opens the game page right at this review
  const reviewLink = review ? `/game/${review.game.id}?review=${review.id}#review-${review.id}` : null;

  // The band game's IMGM verdict, when players have scored it
  const bandScore = bandGame?.ratings?.imgm;
  const bandRarity = typeof bandScore === 'number' && bandGame.reviewCount !== 0 ? getRarity(bandScore) : null;
  // IGDB dates are midnight UTC, so the year is read in UTC (not the visitor's time zone)
  const bandYear = bandGame?.releaseDate ? new Date(bandGame.releaseDate).getUTCFullYear() : null;
  const artCredit = bandGame ? [bandGame.developer, bandYear].filter(Boolean).join(', ') || bandGame.title : '';

  return (
    // Columns: a gutter, the words, the card, a gutter (desktop); a gutter, everything,
    // a gutter (tablets, phones). Rows: title, words, a gap the card reaches into, the
    // band, then the buttons and the caption (and on phones, "Browse games").
    // Desktop: the words column's width plus the card's 400px (360px on small laptops)
    // makes the same width as the page's other sections, so the edges line up.
    <section
      aria-labelledby="home-title"
      className="grid pt-5 grid-cols-[16px_minmax(0,1fr)_16px] grid-rows-[auto_auto_88px_300px_auto_auto_auto] sm:pt-8 sm:grid-cols-[24px_minmax(0,1fr)_24px] sm:grid-rows-[auto_auto_104px_360px_auto_auto] lg:pt-10 lg:grid-cols-[minmax(32px,1fr)_minmax(0,880px)_360px_minmax(32px,1fr)] lg:grid-rows-[auto_auto_32px_260px_auto] xl:grid-cols-[minmax(48px,1fr)_minmax(0,944px)_400px_minmax(48px,1fr)] xl:grid-rows-[auto_auto_32px_280px_auto]"
    >
      {/* The logo's headline: heavy ivory capitals, one lime full stop. The page's h1 (its
          main headline for search engines). One line everywhere: it is about 5.4em
          wide, so 15vw leaves room to spare even on a 320px phone. Desktop sets it
          smaller (8vw) so the card under it fits on the screen. */}
      <h1
        id="home-title"
        className="col-start-2 row-start-1 lg:col-end-4 font-display uppercase tracking-[.005em] text-white text-[length:clamp(40px,15vw,128px)] leading-[.82] lg:text-[length:clamp(80px,8vw,136px)] lg:leading-[.8]"
      >
        I Am Gaming<span className="text-brand">.</span>
      </h1>

      {/* ── What IMGM is, and the way in ── */}
      <div className="col-start-2 row-start-2 relative z-5 min-w-0 pt-4 sm:pt-6 lg:pr-12 xl:pr-16">
        {/* The promise, plainly. From tablets up each sentence gets its own line; phones
            let the two run together, balanced over three lines. */}
        <p className="hero-promise text-[22px] leading-[1.25] font-medium text-white text-balance sm:text-[24px] xl:text-[26px]">
          <span className="sm:block">Players rate the games they play.</span>{' '}
          <span className="sm:block">Every rating becomes a collectible card.</span>
        </p>

        <div className="hero-actions mt-6 flex flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3 lg:mt-8">
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
        <p className="hero-note mt-3 text-sm text-slate-400">About two minutes. Your score sets the card’s rarity.</p>
      </div>

      {/* ── The card, standing over the band and hanging past its bottom edge ── */}
      <div className="col-start-2 row-start-3 row-end-5 self-end justify-self-center relative z-3 min-w-0 w-[min(300px,100%)] -mb-12 sm:w-[min(340px,100%)] sm:-mb-14 lg:col-start-3 lg:row-start-2 lg:justify-self-stretch lg:w-auto lg:-mb-12 xl:-mb-14">
        {review ? (
          <CardStage tier={rarity.key} flipped={flipped} front={<CollectibleCard {...card} />} back={<CardBack />} />
        ) : (
          // Still loading, or nothing to show: a card face down (never a made-up one)
          <FaceDownCard className="rotate-[-2.5deg]" />
        )}
      </div>

      {/* ── The band: a game's key art, edge to edge (a dark band until the reviews load).
          It's the largest picture on the first screen, so it loads first and never lazily;
          the browser picks the 1280px or the 1920px copy for the screen. ── */}
      {bandGame ? (
        <img
          src={bandGame.artworks[0]}
          srcSet={artSrcSet(bandGame.artworks[0])}
          sizes="100vw"
          alt={`${bandGame.title} key art`}
          fetchPriority="high"
          decoding="async"
          className={BAND}
        />
      ) : (
        <div aria-hidden="true" className={BAND} />
      )}

      {/* ── What you can do with the card: under it ── */}
      <div className="col-start-2 row-start-5 lg:col-start-3 relative z-6 min-w-0 flex flex-wrap items-center justify-center gap-x-5 pt-[60px] sm:gap-x-6 sm:pt-[72px] lg:justify-start lg:pt-[68px] xl:pt-[76px]">
        {review ? (
          <>
            <ShareCardButton
              url={reviewLink}
              title={`${card.reviewer}’s card for ${review.game.title}`}
              text={`${review.rating}/10, ${rarity.label} on IMGM`}
            />
            <button type="button" onClick={() => setFlipped((turned) => !turned)} className={TEXT_BUTTON}>
              {flipped ? 'Turn back' : 'Turn over'}
            </button>
            <Link to={reviewLink} className={`inline-flex items-center h-11 text-base font-medium text-white ${TEXT_LINK}`}>
              Read the review
            </Link>
          </>
        ) : (
          !loading && !failed && (
            <p className="max-w-[340px] text-center text-sm text-slate-400 lg:text-left">
              No cards to show yet. Review a game you played, and yours could be the one up here.
            </p>
          )
        )}
      </div>

      {/* ── The caption: whose art the band is, and that game's IMGM verdict ── */}
      {bandGame && (
        <div className="col-start-2 row-start-6 lg:row-start-5 min-w-0 flex flex-wrap items-center justify-between gap-x-8 pt-2 lg:pt-3 lg:pr-12 xl:pr-16">
          <p
            className="flex flex-wrap items-center gap-x-2.5 min-h-11 text-sm text-slate-400"
            style={bandRarity ? { '--ink': bandRarity.color } : undefined}
          >
            {bandRarity && <RarityMark tier={bandRarity.key} className="text-(--ink)" />}
            <Link to={`/game/${bandGame.id}`} className={`inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>
              {bandGame.title}
            </Link>
            {bandRarity && (
              <span>
                <span className="text-xs tabular-nums text-(--ink)">{bandScore.toFixed(1)}</span>{' '}
                <span className="text-(--ink)">{bandRarity.label}</span> on IMGM
                {bandGame.reviewCount > 0 && ` · ${bandGame.reviewCount} review${bandGame.reviewCount === 1 ? '' : 's'}`}
              </span>
            )}
          </p>
          <p className="flex items-center min-h-11 text-sm text-slate-400">Key art · {artCredit}</p>
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
