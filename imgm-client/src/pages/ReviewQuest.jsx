/**
 * ReviewQuest — The "write a review" experience. Route: /game/:id/review
 *
 * Structure:
 *   - One `answers` object holds everything the user has answered so far.
 *   - `step` says which screen is showing. STEPS below lists the screens in order;
 *     each screen is its own small component that reads/updates `answers`.
 *   - Screen 0 (rating) is the only required one. From there the user either posts
 *     a quick review or starts the quest (screens 1–9, all skippable).
 *   - Every screen has Back; quest screens also have Skip, Next and "Finish",
 *     which jumps to Final words (the last screen), where the review is posted.
 *   - If the user already reviewed this game, the quest opens pre-filled and
 *     posting updates that review (one review per person per game).
 */
import { ArrowBigUp, BookmarkCheck, CircleCheck, Clapperboard, Combine, Drama, Gamepad2, Layers, ListChecks, Monitor, PartyPopper, PenLine, Pencil, Scale, Star, Timer, Trash2, Zap } from 'lucide-react';
import ArtIcon from '../components/ArtIcon';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGame, getMyReview, saveReview, deleteMyReview, setBacklogFinished } from '../lib/api';
import { refreshMyProgress } from '../hooks/useMyProgress';
import { getProgress } from '../lib/levels';
import { XpBar } from '../components/LevelBadge';
import { useSession } from '../lib/authClient';
import LoadError from '../components/LoadError';
import RarityStars from '../components/RarityStars';
import {
  EMPTY_ANSWERS, BADGES, RATING_LABELS, CHECKLIST, XP_EASY, XP_WRITTEN, MAX_XP, getRarity,
} from '../components/reviewQuest/questOptions';
import RatingStep from '../components/reviewQuest/steps/RatingStep';
import QuickStep from '../components/reviewQuest/steps/QuickStep';
import SetupStep from '../components/reviewQuest/steps/SetupStep';
import VibesStep from '../components/reviewQuest/steps/VibesStep';
import GotGoodStep from '../components/reviewQuest/steps/GotGoodStep';
import ChecklistStep from '../components/reviewQuest/steps/ChecklistStep';
import MeetsStep from '../components/reviewQuest/steps/MeetsStep';
import ProsConsStep from '../components/reviewQuest/steps/ProsConsStep';
import MomentsStep from '../components/reviewQuest/steps/MomentsStep';
import WordsStep from '../components/reviewQuest/steps/WordsStep';

// The quest, in order. `fields` = what "Skip" clears; `xp` = what answering it earns.
const STEPS = [
  { key: 'rating',    art: Star, title: 'Your rating',             xp: XP_EASY,    Component: RatingStep },
  { key: 'setup',     art: Monitor, title: 'Your setup',              xp: XP_EASY,    Component: SetupStep, fields: ['platform', 'hoursPlayed', 'completionStatus', 'playStyle'] },
  { key: 'vibes',     art: Drama, title: "What's the vibe?",        xp: XP_EASY,    Component: VibesStep, fields: ['vibes'] },
  { key: 'gotGood',   art: Timer, title: 'When did it get good?',   xp: XP_EASY,    Component: GotGoodStep, fields: ['gotGoodAfter'] },
  { key: 'checklist', art: ListChecks, title: 'The checklist',           xp: XP_EASY,    Component: ChecklistStep, fields: CHECKLIST.map((c) => c.field) },
  { key: 'meets',     art: Combine, title: "It's like ___ meets ___", xp: XP_EASY,    Component: MeetsStep, fields: ['comparedA', 'comparedB'] },
  { key: 'prosCons',  art: Scale, title: 'Pros & cons',             xp: XP_EASY,    Component: ProsConsStep, fields: ['pros', 'cons'] },
  { key: 'moments',   art: Clapperboard, title: 'Best & worst moment',     xp: XP_EASY,    Component: MomentsStep, fields: ['bestMoment', 'worstMoment', 'hasSpoilers'] },
  { key: 'words',     art: PenLine, title: 'Final words',             xp: XP_WRITTEN, Component: WordsStep, fields: ['reviewText'] },
];
const LAST_STEP = STEPS.length - 1;

// Done screen: your level after this review — with a fanfare if you levelled up
const LevelProgress = ({ before, after }) => {
  const was = getProgress(before);
  const now = getProgress(after);
  const levelUp = now.level > was.level;
  const newTier = now.tier !== was.tier;
  return (
    <div className="mt-3 mx-auto max-w-xs text-left">
      {levelUp && (
        <p className="text-center text-sm font-black uppercase tracking-[0.2em] mb-2 text-amber-300 animate-pop" style={{ textShadow: '0 0 14px #fbbf2466' }}>
          <ArrowBigUp className="inline w-5 h-5 mr-1 -mt-1" aria-hidden="true" />Level up! {newTier ? <>You're now a <span style={{ color: now.tier.color }}>{now.tier.label}</span></> : `Level ${now.level}`}
        </p>
      )}
      <p className="flex justify-between text-xs font-bold mb-1">
        <span style={{ color: now.tier.color }}>{now.tier.label} · Level {now.level}</span>
        <span className="text-slate-500 tabular-nums">{now.toNext.toLocaleString()} XP to Level {now.level + 1}</span>
      </p>
      <XpBar progress={now} />
    </div>
  );
};

// Special screens that aren't part of the numbered quest
const QUICK = 'quick';
const DONE = 'done';

// Did the user answer this screen? (an answered screen earns XP)
const isAnswered = (answers, step) =>
  (step.fields ?? ['rating']).some((f) => {
    const v = answers[f];
    return Array.isArray(v) ? v.length > 0 : v != null && v !== '' && v !== false;
  });

// Server review → quest answers (for editing). Missing/null values stay "skipped".
const answersFromReview = (review) => {
  const answers = { ...EMPTY_ANSWERS };
  for (const key of Object.keys(EMPTY_ANSWERS)) {
    if (review[key] != null) answers[key] = review[key];
  }
  return answers;
};

// Quest answers → what the server expects (games are sent as ids)
const toPayload = (answers, gameId) => {
  const { comparedA, comparedB, ...rest } = answers;
  return {
    ...rest,
    gameId: Number(gameId),
    comparedAId: comparedA?.id ?? null,
    comparedBId: comparedB?.id ?? null,
  };
};

// A friendly message for a failed save
const saveErrorMessage = (err) => {
  if (err.status === 401) return 'Your login expired. Log in again, then post.';
  if (err.data?.issues?.length) return err.data.issues.map((i) => i.message).join(' · ');
  return err.message || "Couldn't post your review. Please try again.";
};

// After a review of a game in their Backlog: finished, or still playing? (Their call:
// many players review mid-game, so it's never marked by itself.) Finished games stay in
// the Backlog, under Finished.
const BacklogPrompt = ({ gameId, title }) => {
  const [answer, setAnswer] = useState(null); // 'finished' | 'kept'
  if (answer === 'finished') {
    return (
      <p className="mx-auto -mt-3 mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/15 border border-brand/60 text-sm font-bold text-white">
        <BookmarkCheck className="w-4 h-4 text-brand" aria-hidden="true" /> Quest complete! {title} is in your Finished games.
      </p>
    );
  }
  if (answer === 'kept') return <p className="-mt-3 mb-6 text-sm text-slate-400">Kept in your Backlog. Enjoy the rest of it!</p>;
  return (
    <div className="mx-auto -mt-3 mb-6 max-w-sm rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <p className="text-sm text-slate-200">
        <BookmarkCheck className="inline w-4 h-4 mr-1.5 -mt-0.5 text-brand" aria-hidden="true" />
        {title} is in your Backlog. Finished playing?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setBacklogFinished(gameId, true).catch(() => {});
            setAnswer('finished');
          }}
          className="py-2 rounded-xl text-sm font-bold bg-brand text-slate-950 hover:brightness-110 transition"
        >
          Finished it
        </button>
        <button type="button" onClick={() => setAnswer('kept')} className="py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-200 hover:text-white transition">
          Still playing
        </button>
      </div>
    </div>
  );
};

const ReviewQuest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session, isPending: sessionLoading } = useSession();
  const userId = session?.user?.id;

  const [game, setGame] = useState(null);
  const [loadError, setLoadError] = useState(false);
  // The user's existing review of this game (loaded: false until we've checked)
  const [existing, setExisting] = useState({ loaded: false, review: null });

  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  // 0–9 = a quest screen, or QUICK / DONE
  const [step, setStep] = useState(0);

  // Posting
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [result, setResult] = useState(null); // { isNew, newBadges, playerXp } after a successful post

  // Deleting (two taps: "Delete my review" → "Yes, delete it")
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getGame(id, controller.signal)
      .then(setGame)
      .catch((err) => err.name !== 'AbortError' && setLoadError(true));
    return () => controller.abort();
  }, [id]);

  // Already reviewed this game? Then open the quest pre-filled for editing.
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    getMyReview(id, controller.signal)
      .then((review) => {
        if (review) setAnswers(answersFromReview(review));
        setExisting({ loaded: true, review });
      })
      .catch((err) => err.name !== 'AbortError' && setExisting({ loaded: true, review: null }));
    return () => controller.abort();
  }, [id, userId]);

  // Merge a change into the answers, e.g. update({ rating: 9 })
  const update = (patch) => setAnswers((prev) => ({ ...prev, ...patch }));

  const isEditing = Boolean(existing.review);
  const postWord = isEditing ? 'Update' : 'Post';

  // ── Posting ──
  const post = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveReview(toPayload(answers, id));
      const previousBadges = existing.review?.badges ?? [];
      setResult({
        isNew: !isEditing,
        newBadges: saved.badges.filter((b) => !previousBadges.includes(b)),
        playerXp: saved.playerXp, // { before, after }
        inBacklog: saved.inBacklog, // in their Backlog: offer to remove it (never automatic)
      });
      refreshMyProgress(); // the navbar's level updates too
      setExisting({ loaded: true, review: saved });
      setStep(DONE);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeReview = async () => {
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteMyReview(id);
      refreshMyProgress();
      navigate(`/game/${id}`);
    } catch (err) {
      setSaveError(err.message || "Couldn't delete your review. Please try again.");
      setDeleting(false);
    }
  };

  // ── Navigation ──
  const changeStep = (next) => {
    setSaveError(null);
    setStep(next);
  };
  const goBack = () => {
    if (step === 0 || step === DONE) return navigate(`/game/${id}`); // leave the quest
    if (step === QUICK) return changeStep(0);
    changeStep(step - 1);
  };
  const goNext = () => (step === LAST_STEP ? post() : changeStep(step + 1));
  const skip = () => {
    // Clear this screen's answers, then move on
    const cleared = Object.fromEntries(STEPS[step].fields.map((f) => [f, EMPTY_ANSWERS[f]]));
    update(cleared);
    goNext();
  };

  // ── Loading / error / login states ──
  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24">
        <LoadError title="Couldn't load this game" />
      </div>
    );
  }
  if (!game || sessionLoading || (session && !existing.loaded)) {
    return <div className="min-h-[calc(100vh-80px)] animate-pulse bg-slate-900/40" />;
  }
  if (!session) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <span className="mx-auto mb-4 w-14 h-14 rounded-2xl grid place-items-center bg-brand/10 border border-brand/30 text-brand"><Gamepad2 className="w-7 h-7" aria-hidden="true" /></span>
        <h1 className="text-2xl font-bold text-white mb-2">Log in to review {game.title}</h1>
        <p className="text-slate-400 mb-8">Your review helps other players decide what to play next.</p>
        {/* After logging in, come straight back here */}
        <Link
          to={`/login?redirect=${encodeURIComponent(`/game/${id}/review`)}`}
          className="px-6 py-3 bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] rounded-full font-semibold transition"
        >
          Log in
        </Link>
      </div>
    );
  }

  const isQuestScreen = typeof step === 'number';
  const current = isQuestScreen ? STEPS[step] : null;
  const earnedXp = STEPS.filter((s) => isAnswered(answers, s)).reduce((sum, s) => sum + s.xp, 0);
  const rarity = answers.rating ? getRarity(answers.rating) : null;

  // A different screenshot behind every screen
  const backgrounds = game.artworks?.length ? game.artworks : [game.coverUrl];
  const background = backgrounds[(isQuestScreen ? step : 0) % backgrounds.length];

  const primaryButton = 'rounded-xl font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition disabled:opacity-50 disabled:cursor-wait';

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* Game screenshot background — key={background} replays the fade on every change */}
      <div
        key={background}
        className="absolute inset-0 bg-cover bg-center scale-110 blur-sm animate-fade-in"
        style={{ backgroundImage: `url(${background})` }}
      />
      <div className="absolute inset-0 bg-slate-950/75" />

      {/* The quest card */}
      <div className="relative z-10 w-full max-w-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/50 p-6 md:p-8">
        {/* Header: Back · game title · Post now */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <button onClick={goBack} className="text-sm font-semibold text-slate-400 hover:text-white transition whitespace-nowrap">
            ← {step === DONE ? 'Game page' : 'Back'}
          </button>
          <p className="text-sm text-slate-400 truncate">
            {step === DONE ? 'Your review of' : isEditing ? 'Editing your review of' : 'Reviewing'}{' '}
            <span className="text-white font-semibold">{game.title}</span>
          </p>
          {isQuestScreen && step > 0 && step < LAST_STEP ? (
            // Jump to Final words, so everyone gets the chance to write before posting
            <button onClick={() => changeStep(LAST_STEP)} className="text-sm font-semibold text-brand hover:brightness-110 transition whitespace-nowrap">
              Finish ✓
            </button>
          ) : (
            <span className="w-20" /> // keeps the title centered
          )}
        </div>

        {/* XP bar — only during the quest */}
        {isQuestScreen && step > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-bold mb-1.5">
              <span className="text-brand">LEVEL {step + 1} / {STEPS.length}</span>
              <span className="flex items-center gap-3">
                {/* What answering this screen earns — ticked once it's earned */}
                <span className={isAnswered(answers, current) ? 'text-brand' : 'text-slate-300'}>
                  This step: +{current.xp} XP{isAnswered(answers, current) ? ' ✓' : ''}
                </span>
                <span className="text-amber-300 tabular-nums">Total: {earnedXp} / {MAX_XP} XP</span>
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Editing notice on the first screen */}
        {step === 0 && isEditing && (
          <p className="mb-5 text-sm text-slate-200 bg-white/5 border border-slate-700 rounded-xl px-4 py-2.5">
            <Pencil className="inline w-4 h-4 mr-1.5 -mt-0.5 text-brand" aria-hidden="true" />You reviewed this on {new Date(existing.review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
            Your answers are filled in, so change anything and update it.
          </p>
        )}

        {/* The current screen — key={step} replays the fade-in on every screen change */}
        <div key={step} className="animate-fade-in">
          {isQuestScreen && (
            <>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-6">
                <ArtIcon icon={current.art} className="inline w-7 h-7 mr-2.5 -mt-1 text-brand" />{current.title}
              </h1>
              <current.Component answers={answers} update={update} game={game} />
            </>
          )}

          {step === QUICK && <QuickStep answers={answers} update={update} />}

          {step === DONE && result && (
            <div className="text-center py-2">
              <span className="mx-auto mb-3 w-16 h-16 rounded-2xl grid place-items-center bg-brand/10 border border-brand/30 text-brand">{result.isNew ? <PartyPopper className="w-8 h-8" aria-hidden="true" /> : <CircleCheck className="w-8 h-8" aria-hidden="true" />}</span>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-1">
                {result.isNew ? 'Review posted!' : 'Review updated!'}
              </h1>
              <p className="text-slate-400 text-sm mb-6">It's live on {game.title}'s page. Thanks for helping other players!</p>
              {result.inBacklog && <BacklogPrompt gameId={game.id} title={game.title} />}

              {/* The score, as loot */}
              <div
                className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border"
                style={{ borderColor: `${rarity.color}66`, background: `radial-gradient(120% 90% at 50% 100%, ${rarity.color}26, transparent 70%)` }}
              >
                <RarityStars value={answers.rating} size="md" readOnly />
                <p className="text-xl font-black uppercase tracking-[0.2em]" style={{ color: rarity.color, textShadow: `0 0 16px ${rarity.color}66` }}>
                  {rarity.label}
                </p>
                <p className="text-slate-300 text-sm font-semibold">{answers.rating}/10 · {RATING_LABELS[answers.rating]}</p>
              </div>

              <p className="mt-5 text-lg font-black text-amber-300">+{earnedXp} XP</p>
              {result.playerXp && <LevelProgress {...result.playerXp} />}

              {/* Badges */}
              {existing.review?.badges.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {existing.review.badges.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-200 text-sm font-semibold">
                      <ArtIcon icon={BADGES[b]?.art} className="w-4 h-4" />
                      {BADGES[b]?.label ?? b}
                      {result.newBadges.includes(b) && (
                        <span className="text-[10px] font-black bg-amber-400 text-slate-900 rounded px-1 py-px">NEW</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 mt-6"><Layers className="w-3.5 h-3.5" aria-hidden="true" /> Your shareable trading card is coming soon.</p>
            </div>
          )}
        </div>

        {/* A failed post explains itself here, and the answers are kept */}
        {saveError && (
          <p role="alert" className="mt-6 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
            {saveError}
          </p>
        )}

        {/* Footer buttons */}
        <div className="mt-8">
          {step === 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                disabled={!answers.rating}
                onClick={() => changeStep(QUICK)}
                className="py-3.5 rounded-2xl font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Zap className="inline w-4 h-4 mr-1.5 -mt-0.5" aria-hidden="true" />Quick review
                <span className="block text-xs font-normal text-slate-400">Just the score + one line</span>
              </button>
              <button
                disabled={!answers.rating}
                onClick={() => changeStep(1)}
                className="py-3.5 rounded-2xl font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Gamepad2 className="inline w-4 h-4 mr-1.5 -mt-0.5" aria-hidden="true" />{isEditing ? 'Edit the quest' : 'Start the quest'}
                <span className="block text-xs font-semibold text-slate-950/70">{STEPS.length - 1} quick screens · up to {MAX_XP} XP</span>
              </button>
            </div>
          )}

          {/* Delete — only for an existing review, with an "are you sure?" step */}
          {step === 0 && isEditing && (
            <div className="mt-5 text-center">
              {confirmDelete ? (
                <div role="alertdialog" aria-label="Delete review?" className="text-left bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-fade-in">
                  <p className="text-sm font-semibold text-red-200 mb-1">Delete your review of {game.title}?</p>
                  <p className="text-xs text-slate-400 mb-3">Your answers and the badges it earned will be gone. This can't be undone.</p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition"
                    >
                      Keep it
                    </button>
                    <button
                      onClick={removeReview}
                      disabled={deleting}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-50 disabled:cursor-wait"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete it'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-slate-500 hover:text-red-400 transition">
                  <Trash2 className="inline w-4 h-4 mr-1.5 -mt-0.5" aria-hidden="true" />Delete my review
                </button>
              )}
            </div>
          )}

          {isQuestScreen && step > 0 && (
            <div className="flex justify-between gap-3">
              <button onClick={skip} disabled={saving} className="px-5 py-3 rounded-xl font-semibold text-slate-400 hover:text-white transition">
                Skip
              </button>
              <button onClick={goNext} disabled={saving} className={`px-8 py-3 ${primaryButton}`}>
                {step === LAST_STEP ? (saving ? 'Posting…' : `${postWord} review ✓`) : 'Next →'}
              </button>
            </div>
          )}

          {step === QUICK && (
            <button onClick={post} disabled={saving} className={`w-full py-3.5 ${primaryButton}`}>
              {saving ? 'Posting…' : `${postWord} quick review ✓`}
            </button>
          )}

          {step === DONE && (
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => changeStep(0)}
                className="py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600/50 transition"
              >
                <Pencil className="inline w-4 h-4 mr-1.5 -mt-0.5" aria-hidden="true" />Edit my answers
              </button>
              <button onClick={() => navigate(`/game/${id}`)} className={`py-3 ${primaryButton}`}>
                See it on the game page →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewQuest;
