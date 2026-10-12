/**
 * The pieces of the profile page: the picture (with change / remove), the stats, and
 * the player's reviews.
 * Noir: stats as big numerals on hairlines (no boxes), square chips and buttons, and
 * each review tile marked with its tier's mark and ink.
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Clock, Crown, Flame, Star, ThumbsUp, Trash2, Trophy, Users, X } from 'lucide-react';
import { Avatar } from '../reviewCard/RarityCard';
import { BADGES, getRarity } from '../reviewQuest/questOptions';
import ArtIcon from '../ArtIcon';
import RarityMark from '../RarityMark';
import { GHOST_BUTTON } from '../../lib/ui';

// The picture's small ghost buttons
const SMALL_BUTTON =
  'inline-flex items-center gap-1.5 h-9 px-3 rounded-sm text-sm font-medium border border-slate-500 text-white hover:border-white transition-colors duration-120 disabled:opacity-50';
// A group of stats: a quiet label on a hairline
const GROUP = 'border-t border-slate-700 pt-4 flex flex-col gap-3';
const GROUP_LABEL = 'text-sm text-slate-400';
import { Histogram } from '../game/PlayerVerdict';
import { chooseAvatarPreset, deleteAvatar, getMyReviews, uploadAvatar } from '../../lib/api';
import AvatarPicker from './AvatarPicker';
import { resizeToAvatar } from '../../lib/resizeImage';
import { timeAgo } from '../../lib/timeAgo';

// The picture: pick a file → shrunk to 256px → checked by the server → saved
export const ProfilePicture = ({ player, onChanged }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }
  const [picking, setPicking] = useState(false); // the character grid is open

  const choose = async (file) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      await uploadAvatar(await resizeToAvatar(file));
      setMessage({ ok: true, text: 'Looking good! Your new picture is live.' });
      await onChanged();
    } catch (error) {
      setMessage({ ok: false, text: error.message || "Couldn't save that picture." });
    } finally {
      setBusy(false);
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
      setMessage({ ok: false, text: "Couldn't remove the picture. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center sm:items-start gap-3">
      <div className="relative">
        <Avatar name={player.name ?? '?'} user={player} size="w-28 h-28 text-5xl" />
        {busy && <span className="absolute inset-0 rounded-full bg-slate-950/60 grid place-items-center text-xs font-medium text-white">Checking…</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className={SMALL_BUTTON}
        >
          <Camera className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> {player.avatarUpdatedAt ? 'Change picture' : 'Add a picture'}
        </button>
        <button
          type="button"
          onClick={() => setPicking(true)}
          disabled={busy}
          className={SMALL_BUTTON}
        >
          <Users className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Pick a character
        </button>
        {player.avatarUpdatedAt && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label="Remove your picture"
            className="inline-flex items-center h-9 px-2.5 rounded-sm border border-slate-500 text-slate-400 hover:text-red-300 hover:border-red-400/60 transition-colors duration-120 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      {message && (
        <p role="status" className={`text-sm max-w-[16rem] ${message.ok ? 'text-rarity-uncommon' : 'text-red-300'}`}>{message.text}</p>
      )}
      {picking && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/80 animate-fade-in" onClick={() => setPicking(false)}>
          <div role="dialog" aria-modal="true" aria-label="Pick a character" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-sm border border-slate-600 bg-slate-900 p-6 shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)]">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display text-[34px] leading-none tracking-[.005em] text-white">Pick a character</h2>
                <p className="text-sm text-slate-400 mt-1">Be your favorite hero. You can change it any time.</p>
              </div>
              <button type="button" onClick={() => setPicking(false)} aria-label="Close" className="w-11 h-11 -mt-2 -mr-3 shrink-0 grid place-items-center rounded-sm text-slate-400 hover:text-white transition-colors duration-120">
                <X className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <AvatarPicker onPick={pickCharacter} />
          </div>
        </div>
      )}
    </div>
  );
};

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

export const StatsGrid = ({ stats }) => {
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
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
        <div className={GROUP}>
          <span className={GROUP_LABEL}>Game of the Week</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-white">
            <span className="inline-flex items-center gap-1.5"><Flame className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> {stats.gotw.streak}-week streak</span>
            <span className="inline-flex items-center gap-1.5"><Trophy className="w-4 h-4 text-rarity-legendary" strokeWidth={1.8} aria-hidden="true" /> {stats.gotw.winnersPicked} winners picked</span>
            {stats.gotw.kingmaker && <span className="inline-flex items-center gap-1.5 text-rarity-legendary"><Crown className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Kingmaker</span>}
          </div>
        </div>
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
            {badges.length === 0 && stats.topGenres.length === 0 && <span className="text-sm text-slate-400">Review games to earn badges.</span>}
          </div>
        </div>
      </div>
      {stats.reviews > 0 && (
        <div className={GROUP}>
          <p className={`${GROUP_LABEL} mb-1`}>The scores you give</p>
          <Histogram byRating={stats.byRating} />
        </div>
      )}
    </div>
  );
};

const ReviewTile = ({ review }) => {
  const rarity = getRarity(review.rating);
  return (
    <Link
      to={`/game/${review.game.id}`}
      className="group flex gap-3 py-3 px-1 border-t border-slate-700 hover:bg-slate-800 transition-colors duration-120 animate-fade-in"
    >
      {review.game.coverUrl ? (
        <img src={review.game.coverUrl} alt="" loading="lazy" className="w-14 h-20 rounded-sm object-cover bg-slate-800 shrink-0" />
      ) : (
        <div className="w-14 h-20 rounded-sm bg-slate-800 shrink-0" />
      )}
      <div className="min-w-0 flex flex-col gap-1">
        <p className="font-medium text-white leading-tight truncate underline decoration-1 underline-offset-4 decoration-transparent group-hover:decoration-white transition-[text-decoration-color] duration-120">{review.game.title}</p>
        <p className="flex items-center gap-1.5 text-sm" style={{ color: rarity.color }}>
          <RarityMark tier={rarity.key} />
          <span className="font-semibold">{rarity.label}</span>
          <span className="tabular-nums text-slate-400">{review.rating}/10</span>
        </p>
        {review.snippet && <p className="font-serif italic text-base text-slate-200 leading-snug line-clamp-2">“{review.snippet}”</p>}
        <p className="mt-auto text-sm text-slate-400">
          {timeAgo(review.createdAt)}
          {review.helpfulCount > 0 && ` · ${review.helpfulCount} found it helpful`}
        </p>
      </div>
    </Link>
  );
};

// Your reviews, newest first, 12 at a time
export const MyReviews = ({ first, total }) => {
  const [reviews, setReviews] = useState(first);
  const [loading, setLoading] = useState(false);
  if (reviews.length === 0) {
    return (
      <p className="text-slate-400">
        No reviews yet. Find a game you've played and start your first <span className="text-white font-medium">Review Quest</span>.
      </p>
    );
  }
  const more = async () => {
    setLoading(true);
    try {
      const page = await getMyReviews(reviews.length);
      setReviews((current) => [...current, ...page.reviews]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-x-8">
        {reviews.map((review) => <ReviewTile key={review.id} review={review} />)}
      </div>
      {reviews.length < total && (
        <button type="button" onClick={more} disabled={loading} className={`${GHOST_BUTTON} self-center`}>
          {loading ? 'Loading…' : `Show more (${total - reviews.length} left)`}
        </button>
      )}
    </div>
  );
};
