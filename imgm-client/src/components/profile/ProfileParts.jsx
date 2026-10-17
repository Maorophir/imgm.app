/**
 * The pieces of a profile page, shared by your own profile (/profile) and anyone's
 * public one (/u/<gamer tag>): the picture (with change / remove, your own only), the
 * level card, the stats, and the player's reviews as their cards.
 *   `own` marks your own profile: it speaks to you ("Your rank"), explains how you
 *   earn XP (a public profile says in one line what XP is), and shows your Game of the
 *   Week record (stats.gotw, which only your own profile gets: votes are private).
 * Noir: stats as big numerals on hairlines (no boxes), square chips and buttons, and
 * each review shown as its mini card on its painted edge, like the home page's
 * "Fresh from the community".
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Clock, Crown, Flame, Loader2, Star, ThumbsUp, Trash2, Trophy, X } from 'lucide-react';
import { Avatar } from '../reviewCard/RarityCard';
import { BADGES, getRarity } from '../reviewQuest/questOptions';
import ArtIcon from '../ArtIcon';
import CardStage from '../CardStage';
import CollectibleCard from '../CollectibleCard';
import RarityMark from '../RarityMark';
import { XpBar } from '../LevelBadge';
import { TIERS, tierLevels } from '../../lib/levels';
import { GHOST_BUTTON, TEXT_LINK } from '../../lib/ui';

// The avatar's small ghost buttons
const SMALL_BUTTON =
  'inline-flex items-center gap-1.5 h-9 px-3 rounded-sm text-sm font-medium border border-slate-500 text-white hover:border-white transition-colors duration-120 disabled:opacity-50';
// A group of stats: a quiet label on a hairline
const GROUP = 'border-t border-slate-700 pt-4 flex flex-col gap-3';
const GROUP_LABEL = 'text-sm text-slate-400';
import { Histogram } from '../game/PlayerVerdict';
import { chooseAvatarPreset, deleteAvatar, uploadAvatar, wakePictureCheck } from '../../lib/api';
import AvatarPicker from './AvatarPicker';
import ShareCardButton from '../ShareCardButton';
import { reviewCardProps } from '../../lib/reviewCard';
import { resizeToAvatar } from '../../lib/resizeImage';
import { timeAgo } from '../../lib/timeAgo';

// The avatar: one button opens one window with both ways to set it, your own photo
// (pick a file → shrunk to 256px → checked by the server → saved) or one of IMGM's
// characters. The bin beside the button takes it off.
export const ProfilePicture = ({ player, onChanged }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false); // a photo is on its way (and being checked)
  const [message, setMessage] = useState(null); // { ok, text }
  const [picking, setPicking] = useState(false); // the avatar window is open

  const choose = async (file) => {
    if (!file) return;
    setBusy(true);
    setUploading(true);
    setMessage(null);
    try {
      await uploadAvatar(await resizeToAvatar(file));
      setPicking(false);
      setMessage({ ok: true, text: 'Looking good! Your new avatar is live.' });
      await onChanged();
    } catch (error) {
      setMessage({ ok: false, text: error.message || "Couldn't save that avatar." });
    } finally {
      setBusy(false);
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const pickCharacter = async (key) => {
    setBusy(true);
    setMessage(null);
    try {
      await chooseAvatarPreset(key);
      setPicking(false);
      setMessage({ ok: true, text: 'Nice pick! Your new avatar is live.' });
      await onChanged();
    } catch (error) {
      setMessage({ ok: false, text: error.message || "Couldn't save that avatar." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await deleteAvatar();
      await onChanged();
    } catch {
      setMessage({ ok: false, text: "Couldn't remove your avatar. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center sm:items-start gap-3">
      <div className="relative">
        <Avatar name={player.name ?? '?'} user={player} size="w-28 h-28 text-5xl" />
        {busy && (
          <span className="absolute inset-0 rounded-full bg-slate-950/60 grid place-items-center" role="status" aria-label="Saving your avatar">
            <Loader2 className="w-6 h-6 text-white motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setPicking(true);
            // An uploaded photo is checked by the AI service, which sleeps when unused:
            // wake it now, while they pick, so the check doesn't wait for it to start
            wakePictureCheck();
          }}
          disabled={busy}
          className={SMALL_BUTTON}
        >
          <Camera className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> {player.avatarUpdatedAt ? 'Change avatar' : 'Add an avatar'}
        </button>
        {player.avatarUpdatedAt && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label="Remove your avatar"
            className="inline-flex items-center h-9 px-2.5 rounded-sm border border-slate-500 text-slate-400 hover:text-red-300 hover:border-red-400/60 transition-colors duration-120 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      {message && !picking && (
        <p role="status" className={`text-sm max-w-[16rem] ${message.ok ? 'text-rarity-uncommon' : 'text-red-300'}`}>{message.text}</p>
      )}
      {picking && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/80 animate-fade-in" onClick={() => setPicking(false)}>
          <div role="dialog" aria-modal="true" aria-label="Your avatar" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-sm border border-slate-600 bg-slate-900 p-6 shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)]">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display text-[34px] leading-none tracking-[.005em] text-white">Your avatar</h2>
                <p className="text-sm text-slate-400 mt-1">Upload a photo, or be one of our characters. You can change it any time.</p>
              </div>
              <button type="button" onClick={() => setPicking(false)} aria-label="Close" className="w-11 h-11 -mt-2 -mr-3 shrink-0 grid place-items-center rounded-sm text-slate-400 hover:text-white transition-colors duration-120">
                <X className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <AvatarPicker onPick={pickCharacter} onUpload={() => input.current?.click()} busy={busy} uploading={uploading} />
            {/* Anything that went wrong (a photo the server turned down keeps the window
                open, to try another). While a photo is checked, the Upload circle spins. */}
            {message && !busy && (
              <p role="status" className={`mt-4 text-sm ${message.ok ? 'text-rarity-uncommon' : 'text-red-300'}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// The player's tier and level, the bar to the next level, and every tier there is.
// progress: getProgress(xp) plus the review count ({ reviews })
export const LevelCard = ({ progress, own = false }) => (
  // Card stock on a hairline in the tier's ink
  <section
    className="rounded-sm border bg-slate-900 p-6 flex flex-col gap-4"
    style={{ borderColor: `${progress.tier.color}55` }}
  >
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-sm text-slate-400">{own ? 'Your rank' : 'Rank'}</p>
        <p className="font-display text-[34px] leading-none tracking-[.005em] mt-1" style={{ color: progress.tier.color }}>{progress.tier.label}</p>
      </div>
      <p className="text-right">
        <span className="block font-display text-[54px] text-white tabular-nums leading-[.8]">{progress.level}</span>
        <span className="text-sm text-slate-400">Level</span>
      </p>
    </div>

    <div>
      <XpBar progress={progress} />
      <p className="mt-2 flex justify-between gap-3 text-sm text-slate-400 tabular-nums">
        <span>{progress.xp.toLocaleString()} XP · {progress.reviews} review{progress.reviews === 1 ? '' : 's'}</span>
        <span>{progress.toNext.toLocaleString()} XP to Level {progress.level + 1}</span>
      </p>
    </div>

    {/* The ladder, worst → best, the player's tier highlighted */}
    <ol className="grid grid-cols-5 gap-1.5 text-center">
      {TIERS.map((t) => {
        const reached = progress.level >= t.minLevel;
        const isCurrent = t === progress.tier;
        return (
          <li
            key={t.key}
            className={`rounded-sm border px-1 py-2 ${isCurrent ? 'bg-slate-950' : 'border-slate-700'} ${reached ? '' : 'opacity-40'}`}
            style={isCurrent ? { borderColor: t.color } : undefined}
          >
            <span className="block text-xs font-semibold leading-tight" style={{ color: t.color }}>{t.label}</span>
            <span className="block text-xs tabular-nums text-slate-400 mt-0.5">{tierLevels(t)}</span>
          </li>
        );
      })}
    </ol>
    {/* What XP is: a visitor on someone's profile may not know yet */}
    <p className="text-sm text-slate-400">
      {own
        ? 'Earn XP by reviewing: 10 XP per quest screen you answer, 50 XP for your final words (up to 130 per review).'
        : 'Players level up by reviewing games: each review earns up to 130 XP.'}
    </p>
  </section>
);

// One stat: a quiet label on a hairline, the number big in the display face
const Stat = ({ icon: Icon, label, value, children }) => (
  <div className="border-t border-slate-700 pt-3 flex flex-col gap-1">
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> {label}
    </span>
    <span className="font-display text-[34px] leading-none text-white tabular-nums">{value}</span>
    {children}
  </div>
);

// stats.gotw is only there on your own profile; without it the badges take the row
export const StatsGrid = ({ stats, own = false }) => {
  const average = stats.averageGiven;
  const rarity = average != null ? getRarity(Math.round(average)) : null;
  const badges = Object.entries(stats.badges ?? {}).filter(([key]) => BADGES[key]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Star} label="Reviews" value={stats.reviews} />
        <Stat icon={Star} label="Average score" value={average != null ? average.toFixed(1) : '—'}>
          {rarity && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: rarity.color }}>
              <RarityMark tier={rarity.key} />
              {rarity.label}
            </span>
          )}
        </Stat>
        <Stat icon={Clock} label="Hours logged" value={stats.hoursLogged.toLocaleString()} />
        <Stat icon={ThumbsUp} label="Found helpful" value={stats.helpfulVotes} />
      </div>
      <div className={`grid gap-x-8 gap-y-4 ${stats.gotw ? 'md:grid-cols-2' : ''}`}>
        {stats.gotw && (
          <div className={GROUP}>
            <span className={GROUP_LABEL}>Game of the Week</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-white">
              <span className="inline-flex items-center gap-1.5"><Flame className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> {stats.gotw.streak}-week streak</span>
              <span className="inline-flex items-center gap-1.5"><Trophy className="w-4 h-4 text-rarity-legendary" strokeWidth={1.8} aria-hidden="true" /> {stats.gotw.winnersPicked} winners picked</span>
              {stats.gotw.kingmaker && <span className="inline-flex items-center gap-1.5 text-rarity-legendary"><Crown className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Kingmaker</span>}
            </div>
          </div>
        )}
        <div className={GROUP}>
          <span className={GROUP_LABEL}>Badges &amp; favourite genres</span>
          <div className="flex flex-wrap gap-2">
            {badges.map(([key, count]) => (
              <span key={key} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xs border border-slate-600 text-sm font-medium text-white">
                <ArtIcon icon={BADGES[key].art} className="w-3.5 h-3.5 text-rarity-legendary" /> {BADGES[key].label} <span className="text-slate-400 tabular-nums">×{count}</span>
              </span>
            ))}
            {stats.topGenres.map((genre) => (
              <span key={genre} className="inline-flex items-center h-8 px-2.5 rounded-xs border border-slate-600 text-sm text-slate-300">{genre}</span>
            ))}
            {badges.length === 0 && stats.topGenres.length === 0 && (
              <span className="text-sm text-slate-400">{own ? 'Review games to earn badges.' : 'No badges yet.'}</span>
            )}
          </div>
        </div>
      </div>
      {stats.reviews > 0 && (
        <div className={GROUP}>
          <p className={`${GROUP_LABEL} mb-1`}>{own ? 'The scores you give' : 'The scores they give'}</p>
          <Histogram byRating={stats.byRating} />
        </div>
      )}
    </div>
  );
};

// One review as its card, like the home page's Fresh cards: the mini card on its painted
// edge (standing still, the game's name on it), the player's words under it, how long
// ago and how many found it helpful. The whole card opens the game page right at this
// review.
const ReviewCard = ({ review, sharedBy, onCardChange }) => {
  const rarity = getRarity(review.rating);
  return (
    // The keyboard outline goes around the whole card, like the home page's cards
    <figure className="relative min-w-0 animate-fade-in has-[.review-link:focus-visible]:outline-2 has-[.review-link:focus-visible]:outline-offset-4 has-[.review-link:focus-visible]:outline-white">
      <CardStage
        tier={rarity.key}
        tilt={false}
        rest={0}
        className="w-full sm:w-[min(208px,100%)]"
        front={<CollectibleCard variant="mini" title={review.game.title} score={review.rating} coverUrl={review.game.coverUrl} />}
      />
      {review.snippet && (
        // The opening quote mark hangs into the margin, so the words line up (the box
        // reaches out to the left to keep the hanging mark inside the clamp)
        <blockquote className="-ml-[.42em] pl-[.42em] -indent-[.42em] mt-5 sm:mt-7 font-serif italic text-base sm:text-[21px] leading-[1.35] text-white break-words line-clamp-4">
          “{review.snippet}”
        </blockquote>
      )}
      <figcaption className="flex flex-wrap items-center gap-x-3 mt-2 text-xs text-slate-400">
        {/* Its ::after stretches over the whole figure, so the card is one link (one tab
            stop), named for screen readers after the game (the card already shows it)
            and shown as how long ago it was */}
        <Link
          to={`/game/${review.game.id}?review=${review.id}#review-${review.id}`}
          className={`review-link inline-flex items-center min-h-11 tabular-nums after:absolute after:inset-0 focus-visible:outline-none ${TEXT_LINK}`}
        >
          <span className="sr-only">Review of {review.game.title}, </span>
          <time dateTime={review.createdAt}>{timeAgo(review.createdAt)}</time>
        </Link>
        {review.helpfulCount > 0 && <span>{review.helpfulCount} found it helpful</span>}
        {/* Your own profile: share the card as a picture. Above the card's link layer */}
        {sharedBy && (
          <ShareCardButton
            small
            className="relative z-1"
            url={`/game/${review.game.id}?review=${review.id}#review-${review.id}`}
            title={`${sharedBy}’s card for ${review.game.title}`}
            text={`${review.rating}/10, ${getRarity(review.rating).label} on IMGM`}
            card={reviewCardProps({
              game: review.game,
              art: review.art,
              rating: review.rating,
              reviewer: sharedBy,
              date: review.createdAt,
              quote: review.quote,
              badges: review.badges,
            })}
            customize={{ gameId: review.game.id, onChange: (choice) => onCardChange(review.id, choice) }}
          />
        )}
      </figcaption>
    </figure>
  );
};

// A player's reviews as cards, newest first, 12 at a time.
//   first     the first page (from the profile)
//   total     how many reviews the player has
//   loadMore  (offset) => the next page: { reviews }
//   empty     what to say when there are none
//   sharedBy  your gamer tag, on your own profile: each card gets a Share card button
export const PlayerReviews = ({ first, total, loadMore, empty, sharedBy }) => {
  const [reviews, setReviews] = useState(first);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  if (reviews.length === 0) return <p className="text-slate-400">{empty}</p>;
  const more = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const page = await loadMore(reviews.length);
      setReviews((current) => [...current, ...page.reviews]);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      {/* The home page's grid: two columns on phones, then as many 240px columns as fit.
          auto-fill keeps the empty columns, so one or two cards stay card-sized. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] sm:gap-x-8 sm:gap-y-14">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            sharedBy={sharedBy}
            // The list's copy of the review follows the card's new picture and words
            onCardChange={(id, { art, quote }) =>
              setReviews((current) => current.map((r) => (r.id === id ? { ...r, art, quote } : r)))
            }
          />
        ))}
      </div>
      {reviews.length < total && (
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={more} disabled={loading} className={GHOST_BUTTON}>
            {loading ? 'Loading…' : `Show more (${total - reviews.length} left)`}
          </button>
          {failed && <p role="status" className="text-sm text-red-300">Couldn't load more reviews. Please try again.</p>}
        </div>
      )}
    </div>
  );
};
