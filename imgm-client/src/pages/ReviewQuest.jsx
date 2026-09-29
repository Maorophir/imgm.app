/**
 * ReviewQuest — The "write a review" experience. Route: /game/:id/review
 *
 * Structure:
 *   - One `answers` object holds everything the user has answered so far.
 *   - `step` says which screen is showing. STEPS below lists the screens in order;
 *     each screen is its own small component that reads/updates `answers`.
 *   - Screen 0 (rating) is the only required one. From there the user either posts
 *     a quick review or starts the quest (screens 1–9, all skippable).
 *   - Every screen has Back; quest screens also have Skip, Next and "Post now".
 *   - If the user already reviewed this game, the quest opens pre-filled and
 *     posting updates that review (one review per person per game).
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGame, getMyReview, saveReview } from '../lib/api';
import { useSession } from '../lib/authClient';
import LoadError from '../components/LoadError';
import RarityStars from '../components/RarityStars';
import { EMPTY_ANSWERS, BADGES, RATING_LABELS, getRarity } from '../components/reviewQuest/questOptions';
import RatingStep from '../components/reviewQuest/steps/RatingStep';
import QuickStep from '../components/reviewQuest/steps/QuickStep';
import SetupStep from '../components/reviewQuest/steps/SetupStep';
import VibesStep from '../components/reviewQuest/steps/VibesStep';
import GotGoodStep from '../components/reviewQuest/steps/GotGoodStep';
import ScoresStep from '../components/reviewQuest/steps/ScoresStep';
import MeetsStep from '../components/reviewQuest/steps/MeetsStep';
import ProsConsStep from '../components/reviewQuest/steps/ProsConsStep';
import MomentsStep from '../components/reviewQuest/steps/MomentsStep';
import WorthStep from '../components/reviewQuest/steps/WorthStep';
import WordsStep from '../components/reviewQuest/steps/WordsStep';

// The quest, in order. `fields` = what "Skip" clears on that screen.
const STEPS = [
  { key: 'rating',  art: '⭐', title: 'Your rating',                 Component: RatingStep },
  { key: 'setup',   art: '🖥️', title: 'Your setup',                  Component: SetupStep, fields: ['platform', 'hoursPlayed', 'completionStatus', 'difficulty', 'playStyle'] },
  { key: 'vibes',   art: '🎭', title: "What's the vibe?",            Component: VibesStep, fields: ['vibes'] },
  { key: 'gotGood', art: '⏱️', title: 'When did it get good?',       Component: GotGoodStep, fields: ['gotGoodAfter'] },
  { key: 'scores',  art: '📊', title: 'Rate the parts',              Component: ScoresStep, fields: ['scoreStory', 'scoreGameplay', 'scoreVisuals', 'scoreSound', 'scorePerformance'] },
  { key: 'meets',   art: '🎮', title: "It's like ___ meets ___",     Component: MeetsStep, fields: ['comparedA', 'comparedB'] },
  { key: 'prosCons', art: '➕', title: 'Pros & cons',                Component: ProsConsStep, fields: ['pros', 'cons'] },
  { key: 'moments', art: '🎬', title: 'Best & worst moment',         Component: MomentsStep, fields: ['bestMoment', 'worstMoment', 'hasSpoilers'] },
  { key: 'worth',   art: '💰', title: 'Worth it?',                   Component: WorthStep, fields: ['worthPrice', 'replay'] },
  { key: 'words',   art: '✍️', title: 'Your words',                  Component: WordsStep, fields: ['reviewText'] },
];
const LAST_STEP = STEPS.length - 1;
const XP_PER_SCREEN = 100;

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
  const [result, setResult] = useState(null); // { isNew, newBadges } after a successful post

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
      });
      setExisting({ loaded: true, review: saved });
      setStep(DONE);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
    } finally {
      setSaving(false);
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
        <p className="text-5xl mb-4">🎮</p>
        <h1 className="text-2xl font-bold text-white mb-2">Log in to review {game.title}</h1>
        <p className="text-slate-400 mb-8">Your review helps other players decide what to play next.</p>
        {/* After logging in, come straight back here */}
        <Link
          to={`/login?redirect=${encodeURIComponent(`/game/${id}/review`)}`}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition"
        >
          Log in
        </Link>
      </div>
    );
  }

  const isQuestScreen = typeof step === 'number';
  const current = isQuestScreen ? STEPS[step] : null;
  const earnedXp = STEPS.filter((s) => isAnswered(answers, s)).length * XP_PER_SCREEN;
  const rarity = answers.rating ? getRarity(answers.rating) : null;

  // A different screenshot behind every screen
  const backgrounds = game.artworks?.length ? game.artworks : [game.coverUrl];
  const background = backgrounds[(isQuestScreen ? step : 0) % backgrounds.length];

  const primaryButton = 'rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition disabled:opacity-50 disabled:cursor-wait';

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
          {isQuestScreen && step > 0 ? (
            <button onClick={post} disabled={saving} className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition whitespace-nowrap disabled:opacity-50">
              {postWord} now ✓
            </button>
          ) : (
            <span className="w-20" /> // keeps the title centered
          )}
        </div>

        {/* XP bar — only during the quest */}
        {isQuestScreen && step > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-blue-300">LEVEL {step + 1} / {STEPS.length}</span>
              <span className="text-amber-300">{earnedXp} XP</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Editing notice on the first screen */}
        {step === 0 && isEditing && (
          <p className="mb-5 text-sm text-blue-200 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2.5">
            ✏️ You reviewed this on {new Date(existing.review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
            Your answers are filled in, so change anything and update it.
          </p>
        )}

        {/* The current screen — key={step} replays the fade-in on every screen change */}
        <div key={step} className="animate-fade-in">
          {isQuestScreen && (
            <>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-6">
                <span className="mr-2">{current.art}</span>{current.title}
              </h1>
              <current.Component answers={answers} update={update} game={game} />
            </>
          )}

          {step === QUICK && <QuickStep answers={answers} update={update} />}

          {step === DONE && result && (
            <div className="text-center py-2">
              <p className="text-5xl mb-2">{result.isNew ? '🎉' : '✅'}</p>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-1">
                {result.isNew ? 'Review posted!' : 'Review updated!'}
              </h1>
              <p className="text-slate-400 text-sm mb-6">It's live on {game.title}'s page. Thanks for helping other players!</p>

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

              {/* Badges */}
              {existing.review?.badges.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {existing.review.badges.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-200 text-sm font-semibold">
                      <span aria-hidden="true">{BADGES[b]?.art}</span>
                      {BADGES[b]?.label ?? b}
                      {result.newBadges.includes(b) && (
                        <span className="text-[10px] font-black bg-amber-400 text-slate-900 rounded px-1 py-px">NEW</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 mt-6">🃏 Your shareable trading card is coming soon.</p>
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
                ⚡ Quick review
                <span className="block text-xs font-normal text-slate-400">Just the score + one line</span>
              </button>
              <button
                disabled={!answers.rating}
                onClick={() => changeStep(1)}
                className="py-3.5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                🎮 {isEditing ? 'Edit the quest' : 'Start the quest'}
                <span className="block text-xs font-normal text-blue-100/80">9 fun questions · about 2 min</span>
              </button>
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
                ✏️ Edit my answers
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
