/**
 * HomeHero — the top of the home page: the title, the way in, and a real card.
 *
 *   The title    "I am gaming." in huge condensed capitals with the lime full stop
 *   The way in   the one lime button starts a review quest (it asks which game you
 *                played last); "Browse games" scrolls down to the featured games
 *   The card     the best review written lately (highest score, newest first) as a
 *                trading card, laid across a full-width band of a game's key art. It
 *                tilts toward the pointer, turns over, and its link can be shared.
 *
 * Everything on it is real. The band shows the card's own game (its key art, which the
 * Home page fetches); only when that game has no art does it show a featured game's art,
 * and then the caption under it names that game. With no review to show yet, the card
 * lies face down and invites the first one.
 *
 * Layout: one grid, so the card can sit across the band. On desktop the title spans the
 * top, the words sit left and the card stands in its own column, hanging over the band's
 * bottom edge. On tablets and phones it all stacks: title, words, then the card centred
 * over the band, with its buttons and the caption below.
 *
 * Props:
 *   review    the review on show ({ id, rating, author, createdAt, game }), or null
 *   card      its CollectibleCard props (built by the Home page)
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
import { getRarity, MAX_XP } from '../reviewQuest/questOptions';
import { usePlayNextAccess } from '../../hooks/usePlayNextAccess';
import { TEXT_LINK, TEXT_BUTTON, PRIMARY_BUTTON } from '../../lib/ui';

// The band of key art, edge to edge. Its height steps down with the screen; the grid
// row it sits in (see the section's classes) has the same height.
const BAND =
  'col-span-full row-start-4 relative z-1 block w-full h-[300px] sm:h-[360px] lg:h-[400px] xl:h-[440px] object-cover object-[50%_40%] bg-slate-900';

const HomeHero = ({ review, card, loading, failed, bandGame, onBrowse }) => {
  const playNext = usePlayNextAccess();
  // Showing the card's back ("Turn over")
  const [flipped, setFlipped] = useState(false);

  const rarity = review ? getRarity(review.rating) : null;
  // Opens the game page right at this review
  const reviewLink = review ? `/game/${review.game.id}?review=${review.id}#review-${review.id}` : null;

  // The band game's IMGM verdict, when players have scored it
  const bandScore = bandGame?.ratings?.imgm;
  const bandRarity = typeof bandScore === 'number' && bandGame.reviewCount !== 0 ? getRarity(bandScore) : null;
  const bandYear = bandGame?.releaseDate ? new Date(bandGame.releaseDate).getFullYear() : null;
  const artCredit = bandGame ? [bandGame.developer, bandYear].filter(Boolean).join(', ') || bandGame.title : '';

  return (
    // Columns: a gutter, the words, the card, a gutter (desktop); a gutter, everything,
    // a gutter (tablets, phones). Rows: title, words, a gap the card reaches into, the
    // band, then the buttons and the caption.
    <section
      aria-labelledby="home-title"
      className="grid pt-7 grid-cols-[16px_minmax(0,1fr)_16px] grid-rows-[auto_auto_96px_300px_auto_auto] sm:pt-10 sm:grid-cols-[24px_minmax(0,1fr)_24px] sm:grid-rows-[auto_auto_104px_360px_auto_auto] lg:pt-14 lg:grid-cols-[minmax(32px,1fr)_minmax(0,820px)_400px_minmax(32px,1fr)] lg:grid-rows-[auto_auto_64px_400px_auto] xl:grid-cols-[minmax(48px,1fr)_minmax(0,864px)_480px_minmax(48px,1fr)] xl:grid-rows-[auto_auto_64px_440px_auto]"
    >
      {/* The logo's headline: heavy ivory capitals, one lime full stop. The page's h1 (its
          main headline for search engines). Phones put "I am" and "gaming." on two lines. */}
      <h1
        id="home-title"
        className="col-start-2 row-start-1 lg:col-end-4 font-display uppercase tracking-[.005em] text-white text-[length:clamp(64px,24vw,112px)] leading-[.82] sm:text-[length:clamp(72px,15vw,216px)] sm:leading-[.8]"
      >
        <span className="block sm:inline">I Am</span>{' '}
        <span className="block sm:inline">
          Gaming<span className="text-brand">.</span>
        </span>
      </h1>

      {/* ── What IMGM is, and the way in ── */}
      <div className="col-start-2 row-start-2 relative z-5 min-w-0 pt-6 sm:pt-8 lg:pt-10 lg:pr-12 xl:pr-16">
        <p className="text-[21px] leading-[1.4] font-medium text-white">Rate what you play. Discover what’s next.</p>
        <p className="mt-3 max-w-[500px] text-base leading-[1.6] text-white">
          Every review is a quest: about two minutes, up to {MAX_XP} XP, and a card at the end.
        </p>

        <div className="mt-9 flex flex-col items-stretch gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3">
          {/* The page's one primary action, so it's the one lime button. It asks which
              game you played last (Search's quest mode) and opens that game's quest. */}
          <Link to="/search?quest=1" className={PRIMARY_BUTTON}>
            Start your first quest
          </Link>
          {/* A real link to the section (it works without the scroll, and in a new tab),
              but the page scrolls itself: a plain #link would count as a new page */}
          <a href="#featured" onClick={onBrowse} className={`inline-flex items-center justify-center min-h-11 text-base font-medium text-white ${TEXT_LINK}`}>
            Browse games
          </a>
        </div>

        {/* Only for players who may use Play Next (the server decides) */}
        {playNext.enabled && (
          <p className="mt-3 text-sm text-slate-400">
            Not sure what to play?{' '}
            <Link to="/play-next" className={`inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>
              Ask Play Next
            </Link>
          </p>
        )}
      </div>

      {/* ── The card, standing over the band and hanging past its bottom edge ── */}
      <div className="col-start-2 row-start-3 row-end-5 self-end justify-self-center relative z-3 min-w-0 w-[min(300px,100%)] -mb-12 sm:w-[min(340px,100%)] sm:-mb-14 lg:col-start-3 lg:row-start-2 lg:justify-self-stretch lg:w-auto lg:-mb-16 xl:-mb-18">
        {review ? (
          <CardStage tier={rarity.key} flipped={flipped} front={<CollectibleCard {...card} />} back={<CardBack />} />
        ) : (
          // Still loading, or nothing to show: a card face down (never a made-up one)
          <FaceDownCard className="rotate-[-2.5deg]" />
        )}
      </div>

      {/* ── The band: a game's key art, edge to edge (a dark band until the games load) ── */}
      {bandGame ? (
        <img src={bandGame.artworks[0]} alt={`${bandGame.title} key art`} fetchPriority="high" decoding="async" className={BAND} />
      ) : (
        <div aria-hidden="true" className={BAND} />
      )}

      {/* ── What you can do with the card: under it ── */}
      <div className="col-start-2 row-start-5 lg:col-start-3 relative z-6 min-w-0 flex flex-wrap items-center justify-center gap-x-5 pt-[60px] sm:gap-x-6 sm:pt-[72px] lg:justify-start lg:pt-[84px] xl:pt-[92px]">
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
    </section>
  );
};

export default HomeHero;
