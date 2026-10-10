/**
 * The pieces of the profile page: the picture (with change / remove), the stats, and
 * the player's reviews.
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Clock, Crown, Flame, Star, ThumbsUp, Trash2, Trophy } from 'lucide-react';
import { Avatar } from '../reviewCard/RarityCard';
import { BADGES, getRarity } from '../reviewQuest/questOptions';
import ArtIcon from '../ArtIcon';
import { Histogram } from '../game/PlayerVerdict';
import { deleteAvatar, getMyReviews, uploadAvatar } from '../../lib/api';
import { resizeToAvatar } from '../../lib/resizeImage';
import { timeAgo } from '../../lib/timeAgo';

// The picture: pick a file → shrunk to 256px → checked by the server → saved
export const ProfilePicture = ({ player, onChanged }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }

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
        {busy && <span className="absolute inset-0 rounded-full bg-slate-950/60 grid place-items-center text-xs font-bold text-white">Checking…</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 transition disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" /> {player.avatarUpdatedAt ? 'Change picture' : 'Add a picture'}
        </button>
        {player.avatarUpdatedAt && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label="Remove your picture"
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-700 text-slate-400 hover:text-red-300 hover:border-red-400/60 transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      {message && (
        <p role="status" className={`text-xs max-w-[16rem] ${message.ok ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>
      )}
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, color = 'text-brand', children }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-1">
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
      <Icon className={`w-3.5 h-3.5 ${color}`} aria-hidden="true" /> {label}
    </span>
    <span className="text-2xl font-black text-white tabular-nums">{value}</span>
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
        <Stat icon={Star} label="Average score" value={average != null ? average.toFixed(1) : '—'} color="text-amber-300">
          {rarity && <span className="text-xs font-bold uppercase tracking-wider" style={{ color: rarity.color }}>{rarity.label}</span>}
        </Stat>
        <Stat icon={Clock} label="Hours logged" value={stats.hoursLogged.toLocaleString()} />
        <Stat icon={ThumbsUp} label="Found helpful" value={stats.helpfulVotes} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Game of the Week</span>
          <div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-200">
            <span className="inline-flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-400" aria-hidden="true" /> {stats.gotw.streak}-week streak</span>
            <span className="inline-flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-300" aria-hidden="true" /> {stats.gotw.winnersPicked} winners picked</span>
            {stats.gotw.kingmaker && <span className="inline-flex items-center gap-1.5 text-amber-200"><Crown className="w-4 h-4" aria-hidden="true" /> Kingmaker</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Badges &amp; favourite genres</span>
          <div className="flex flex-wrap gap-2">
            {badges.map(([key, count]) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/35 text-amber-200">
                <ArtIcon icon={BADGES[key].art} className="w-3.5 h-3.5" /> {BADGES[key].label} ×{count}
              </span>
            ))}
            {stats.topGenres.map((genre) => (
              <span key={genre} className="text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-700 text-slate-300">{genre}</span>
            ))}
            {badges.length === 0 && stats.topGenres.length === 0 && <span className="text-sm text-slate-500">Review games to earn badges.</span>}
          </div>
        </div>
      </div>
      {stats.reviews > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">The scores you give</p>
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
      className="flex gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition animate-fade-in"
      style={{ boxShadow: `inset 3px 0 0 ${rarity.color}` }}
    >
      {review.game.coverUrl ? (
        <img src={review.game.coverUrl} alt="" loading="lazy" className="w-14 h-20 rounded-lg object-cover bg-slate-800 shrink-0" />
      ) : (
        <div className="w-14 h-20 rounded-lg bg-slate-800 shrink-0" />
      )}
      <div className="min-w-0 flex flex-col gap-1">
        <p className="font-bold text-white leading-tight truncate">{review.game.title}</p>
        <p className="text-xs font-bold" style={{ color: rarity.color }}>
          <span className="uppercase tracking-wider">{rarity.label}</span> {review.rating}/10
        </p>
        {review.snippet && <p className="text-sm text-slate-300 leading-snug line-clamp-2">“{review.snippet}”</p>}
        <p className="mt-auto text-[11px] text-slate-500">
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
        No reviews yet. Find a game you've played and start your first <span className="text-brand font-semibold">Review Quest</span>.
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
      <div className="grid sm:grid-cols-2 gap-3">
        {reviews.map((review) => <ReviewTile key={review.id} review={review} />)}
      </div>
      {reviews.length < total && (
        <button type="button" onClick={more} disabled={loading} className="self-center px-5 py-2.5 rounded-full text-sm font-bold border border-slate-700 text-white hover:border-brand/60 transition disabled:opacity-50">
          {loading ? 'Loading…' : `Show more (${total - reviews.length} left)`}
        </button>
      )}
    </div>
  );
};
