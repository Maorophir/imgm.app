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
 *   - Once posted, the done screen deals the review's card: the same trading card the
 *     home page shows, which can be turned over and shared. Under it, "Rate another
 *     game" offers three more to rate (RateAnother), so a player can keep going.
 *   - Logged out, the page asks you to sign up first ("Rate <game>", Sign up, or "I
 *     already have an account") over the game's art, with a face-down card for the one
 *     they're about to earn; either way you come straight back to the quest.
 *   - Each game's quest starts fresh: going from one game's done screen to another
 *     game's quest (same route, new :id) remounts the page (the key on Quest).
 *   - XP is explained the first time it's offered ("up to 130 XP toward your level").
 *   - A game that isn't out yet can't be rated: the page shows its release date, Add
 *     to Backlog and the way back to the game page instead. A player who already has a
 *     review of it (its date was pushed back) can still edit or delete that review.
 *
 * Noir: one flat panel of card stock over the game's art (no blur, no glow), the big
 * condensed headings, and lime only on the screen's one main action.
 */
import { ArrowBigUp, ArrowLeft, ArrowRight, BookmarkCheck, Check, Clapperboard, Combine, Drama, Gamepad2, ListChecks, Monitor, PenLine, Pencil, Scale, Star, Timer, Trash2, Zap } from 'lucide-react';
import ArtIcon from '../components/ArtIcon';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGame, getMyReview, saveReview, deleteMyReview, setBacklogFinished } from '../lib/api';
import { isUnreleased, releaseLabel } from '../lib/release';
import { refreshMyProgress } from '../hooks/useMyProgress';
import { getProgress } from '../lib/levels';
import { shortGenre } from '../lib/gameLabels';
import { PRIMARY_BUTTON, GHOST_BUTTON_SM, GHOST_BUTTON_TALL, TEXT_BUTTON, TEXT_BUTTON_SM, TEXT_LINK, SECTION_TITLE } from '../lib/ui';
import { XpBar } from '../components/LevelBadge';
import { authClient, useSession } from '../lib/authClient';
import LoadError from '../components/LoadError';
import BacklogButton from '../components/BacklogButton';
import CardStage from '../components/CardStage';
import CollectibleCard, { CardBack, ChecklistBack } from '../components/CollectibleCard';
import { tickedChecklist } from '../components/reviewCard/reviewDisplay';
import ShareCardButton from '../components/ShareCardButton';
import CardQuote from '../components/CardQuote';
import FaceDownCard from '../components/home/FaceDownCard';
import RateAnother from '../components/reviewQuest/RateAnother';
import {
  EMPTY_ANSWERS, BADGES, CHECKLIST, XP_EASY, XP_WRITTEN, MAX_XP, getRarity,
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

// The quest's own screens use the section-heading size, with the step's icon in grey
const STEP_TITLE = `flex items-center gap-3 mb-6 ${SECTION_TITLE}`;
const STEP_ICON = 'w-7 h-7 sm:w-10 sm:h-10 shrink-0 text-slate-400';

// Done screen: your level after this review, with a note if you levelled up
const LevelProgress = ({ before, after }) => {
  const was = getProgress(before);
  const now = getProgress(after);
  const levelUp = now.level > was.level;
  const newTier = now.tier !== was.tier;
  return (
    <div className="mt-3 mx-auto max-w-xs text-left">
      {levelUp && (
        <p className="flex items-center justify-center gap-1.5 mb-2 text-sm font-semibold text-white animate-pop">
          <ArrowBigUp className="w-5 h-5 text-slate-400" aria-hidden="true" />
          <span>Level up! {newTier ? <>You're now a <span style={{ color: now.tier.color }}>{now.tier.label}</span></> : `Level ${now.level}`}</span>
        </p>
      )}
      <p className="flex justify-between gap-3 text-sm mb-1.5">
        <span className="font-medium" style={{ color: now.tier.color }}>{now.tier.label} · Level {now.level}</span>
        <span className="text-slate-400 tabular-nums">{now.toNext.toLocaleString()} XP to Level {now.level + 1}</span>
      </p>
      <XpBar progress={now} />
    </div>
  );
};


// The small print on the card: "RPG · 2015" (IGDB dates are midnight UTC, so the year
// is read in UTC: a 1 January release would show the year before in the Americas)
const gameMeta = (game) =>
  [game.genres?.[0] && shortGenre(game.genres[0]), game.releaseDate && new Date(game.releaseDate).getUTCFullYear()]
    .filter(Boolean)
    .join(' · ') || undefined;

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

// Unconfirmed email over the review limit: send the confirmation link again from here
const ResendEmailButton = ({ email }) => {
  const [sent, setSent] = useState(null); // 'sent' | 'error'
  if (sent === 'sent') return <span className="font-semibold text-white">Sent! Check your inbox (and spam).</span>;
  return (
    <button
      type="button"
      onClick={async () => {
        const { error } = await authClient.sendVerificationEmail({ email, callbackURL: `${window.location.origin}/?verified=1` });
        setSent(error ? 'error' : 'sent');
      }}
      className={`font-medium text-white ${TEXT_LINK}`}
    >
      {sent === 'error' ? "Couldn't send it. Try again" : 'Send the email again'}
    </button>
  );
};

// After a review of a game in their Backlog: finished, or still playing? (Their call:
// many players review mid-game, so it's never marked by itself.) Finished games stay in
// the Backlog, under Finished.
const BacklogPrompt = ({ gameId, title }) => {
  const [answer, setAnswer] = useState(null); // 'finished' | 'kept'
  if (answer === 'finished') {
    return (
      <p className="mx-auto -mt-3 mb-6 inline-flex items-center gap-2 text-sm font-medium text-white">
        <BookmarkCheck className="w-4 h-4 text-slate-400" aria-hidden="true" /> Quest complete! {title} is in your Finished games.
      </p>
    );
  }
  if (answer === 'kept') return <p className="-mt-3 mb-6 text-sm text-slate-400">Kept in your Backlog. Enjoy the rest of it!</p>;
  return (
    <div className="mx-auto -mt-3 mb-6 max-w-sm rounded-sm border border-slate-700 bg-slate-950 p-4">
      <p className="text-sm text-slate-200">
        <BookmarkCheck className="inline w-4 h-4 mr-1.5 -mt-0.5 text-slate-400" aria-hidden="true" />
        {title} is in your Backlog. Finished playing?
      </p>
      {/* Both are answers, neither is the screen's main action: two ghosts */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setBacklogFinished(gameId, true).catch(() => {});
            setAnswer('finished');
          }}
          className={GHOST_BUTTON_SM}
        >
          Finished it
        </button>
        <button type="button" onClick={() => setAnswer('kept')} className={GHOST_BUTTON_SM}>
          Still playing
        </button>
      </div>
    </div>
  );
};

// A game that isn't out yet: its release date, and the Backlog to remember it by. The
// Backlog button is a ghost: with nothing to post, there's no lime on this page.
const NotOutYet = ({ game }) => (
  <div className="max-w-xl mx-auto px-4 sm:px-6 py-24 text-center">
    <h1 className={`${SECTION_TITLE} text-balance mb-3`}>{game.title}</h1>
    <p className="text-slate-400 mb-8">
      <span className="font-medium text-white">{releaseLabel(game.releaseDate)}.</span> You can rate it once it's out.
    </p>
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <BacklogButton gameId={game.id} variant="pill" />
      <Link to={`/game/${game.id}`} className={`inline-flex items-center h-11 font-medium text-white ${TEXT_LINK}`}>
        Back to the game page
      </Link>
    </div>
  </div>
);

// The game's art behind the quest: a different picture per screen where there are
// several (its artworks), else the cover
const questArt = (game) => (game.artworks?.length ? game.artworks : [game.coverUrl]);

// The quest's stage: the game's art across the page, darkened (no blur: Noir has no
// frosted glass), with the panel centred on it. key={art} replays the fade on every change.
const QuestStage = ({ art, children }) => (
  <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10 overflow-hidden">
    {art && (
      <div
        key={art}
        className="absolute inset-0 bg-cover bg-center animate-fade-in"
        style={{ backgroundImage: `url(${art})` }}
      />
    )}
    <div className="absolute inset-0 bg-slate-950/75" />
    {children}
  </div>
);

// Logged out: most people here are new, so signing up is the main action. Either way
// they come straight back to this quest (new players choose a gamer tag on the way).
// The game's art (the quest's first screen's) and a face-down card show what this is
// and what they get: their own card for this game.
const SignUpGate = ({ game, id }) => {
  const back = encodeURIComponent(`/game/${id}/review`);
  return (
    <QuestStage art={questArt(game)[0]}>
      <div className="relative z-10 w-full max-w-xl bg-slate-900 border border-slate-700 rounded-sm px-6 py-10 md:px-8 text-center">
        <FaceDownCard small className="w-28 mx-auto mb-8" />
        <h1 className={`${SECTION_TITLE} text-balance mb-3`}>Rate {game.title}</h1>
        <p className="text-slate-400 mb-8">Make a free account to keep your card.</p>
        <div className="flex flex-col items-center gap-3">
          <Link to={`/login?mode=signup&redirect=${back}`} className={PRIMARY_BUTTON}>
            Sign up
          </Link>
          <Link to={`/login?redirect=${back}`} className={`inline-flex items-center h-11 font-medium text-white ${TEXT_LINK}`}>
            I already have an account
          </Link>
        </div>
      </div>
    </QuestStage>
  );
};

const Quest = ({ id }) => {
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
  const [saveErrorCode, setSaveErrorCode] = useState(null); // e.g. EMAIL_NOT_CONFIRMED: offer to resend
  const [result, setResult] = useState(null); // { isNew, newBadges, badges, playerXp } after a successful post

  // Deleting (two taps: "Delete my review", then "Yes, delete it")
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The done screen's card: showing its back ("Turn over"), the checklist answers it
  // turns over to (none: the shared IMGM back)
  const [flipped, setFlipped] = useState(false);
  const cardTicks = tickedChecklist(answers);

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
        badges: saved.badges, // every badge the review has (shown on its card)
        playerXp: saved.playerXp, // { before, after }
        inBacklog: saved.inBacklog, // in their Backlog: offer to remove it (never automatic)
      });
      refreshMyProgress(); // the navbar's level updates too
      setExisting({ loaded: true, review: saved });
      setStep(DONE);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
      setSaveErrorCode(err.data?.code ?? null);
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24">
        <LoadError title="Couldn't load this game" />
      </div>
    );
  }
  if (!game || sessionLoading || (session && !existing.loaded)) {
    return <div className="min-h-[calc(100vh-80px)] animate-pulse bg-slate-900/40" />;
  }
  // Not out yet: nothing to rate, logged in or not (but their own review stays editable)
  if (isUnreleased(game.releaseDate) && !existing.review) return <NotOutYet game={game} />;
  if (!session) return <SignUpGate game={game} id={id} />;

  const isQuestScreen = typeof step === 'number';
  const current = isQuestScreen ? STEPS[step] : null;
  const earnedXp = STEPS.filter((s) => isAnswered(answers, s)).reduce((sum, s) => sum + s.xp, 0);
  const rarity = answers.rating ? getRarity(answers.rating) : null;

  // A different screenshot behind every screen
  const backgrounds = questArt(game);
  const background = backgrounds[(isQuestScreen ? step : 0) % backgrounds.length];

  // The posted review, and the link that opens it on the game page
  const savedId = existing.review?.id;
  const reviewLink = savedId ? `/game/${game.id}?review=${savedId}#review-${savedId}` : `/game/${game.id}`;

  return (
    <QuestStage art={background}>
      {/* The quest panel: flat card stock on a hairline */}
      <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-sm p-6 md:p-8">
        {/* Header: Back · game title · Finish */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <button type="button" onClick={goBack} className={`inline-flex items-center gap-1.5 whitespace-nowrap ${TEXT_BUTTON_SM}`}>
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            {step === DONE ? 'Game page' : 'Back'}
          </button>
          <p className="text-sm text-slate-400 truncate">
            {step === DONE ? 'Your review of' : isEditing ? 'Editing your review of' : 'Reviewing'}{' '}
            <span className="text-white font-semibold">{game.title}</span>
          </p>
          {isQuestScreen && step > 0 && step < LAST_STEP ? (
            // Jump to Final words, so everyone gets the chance to write before posting
            <button type="button" onClick={() => changeStep(LAST_STEP)} className={`whitespace-nowrap ${TEXT_BUTTON_SM}`}>
              Finish
            </button>
          ) : (
            <span className="w-14" /> // keeps the title centered
          )}
        </div>

        {/* Progress through the quest, and its XP: only on the quest's own screens */}
        {isQuestScreen && step > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2 text-sm tabular-nums text-slate-400">
              <span>Step {step + 1} of {STEPS.length}</span>
              <span className="flex items-center gap-3">
                {/* What answering this screen earns, ticked once it's earned */}
                <span className={`inline-flex items-center gap-1 ${isAnswered(answers, current) ? 'text-white' : ''}`}>
                  This step: +{current.xp} XP
                  {isAnswered(answers, current) && <Check className="w-3.5 h-3.5" strokeWidth={2.4} aria-label="earned" />}
                </span>
                <span>Total: {earnedXp} / {MAX_XP} XP</span>
              </span>
            </div>
            <div className="h-1 bg-slate-700">
              <div
                className="h-full bg-white transition-[width] duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Editing notice on the first screen */}
        {step === 0 && isEditing && (
          <p className="mb-5 text-sm text-slate-200 border border-slate-700 bg-slate-950 rounded-sm px-4 py-2.5">
            <Pencil className="inline w-4 h-4 mr-1.5 -mt-0.5 text-slate-400" aria-hidden="true" />You reviewed this on {new Date(existing.review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
            Your answers are filled in, so change anything and update it.
          </p>
        )}

        {/* The current screen. key={step} replays the fade-in on every screen change. */}
        <div key={step} className="animate-fade-in">
          {isQuestScreen && (
            <>
              <h1 className={STEP_TITLE}>
                <ArtIcon icon={current.art} className={STEP_ICON} />{current.title}
              </h1>
              <current.Component answers={answers} update={update} game={game} />
            </>
          )}

          {step === QUICK && <QuickStep answers={answers} update={update} />}

          {step === DONE && result && (
            <div className="text-center py-2">
              <h1 className={`${SECTION_TITLE} mb-2`}>
                {result.isNew ? 'Review posted' : 'Review updated'}
              </h1>
              <p className="text-slate-400 text-sm mb-6">It's live on {game.title}'s page. Thanks for helping other players!</p>
              {result.inBacklog && <BacklogPrompt gameId={game.id} title={game.title} />}

              {/* The quest's reward: the review as a trading card, like the home page's (and,
                  turned over, its checklist) */}
              <CardStage
                tier={rarity.key}
                flipped={flipped}
                className="w-[min(340px,100%)] mx-auto"
                front={
                  <CollectibleCard
                    title={game.title}
                    score={answers.rating}
                    coverUrl={game.coverUrl}
                    meta={gameMeta(game)}
                    credit={game.developer ? `Cover · ${game.developer}` : undefined}
                    reviewer={session.user.displayUsername}
                    date={existing.review?.createdAt ?? new Date()}
                    badges={result.badges ?? []}
                  />
                }
                // Turned over: the checklist they just filled in (or the shared back if they skipped it)
                back={
                  cardTicks.length > 0
                    ? <ChecklistBack score={answers.rating} ticks={cardTicks} name={session.user.displayUsername ?? 'You'} />
                    : <CardBack />
                }
              />
              {/* Their words, beside (under) the card: the card itself carries none */}
              <CardQuote text={answers.reviewText?.trim()} lines={6} className="mt-6 mx-auto max-w-[480px] text-left" />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6">
                <ShareCardButton
                  url={reviewLink}
                  title={`${session.user.displayUsername ?? 'My'}’s card for ${game.title}`}
                  text={`${answers.rating}/10, ${rarity.label} on IMGM`}
                />
                <button
                  type="button"
                  onClick={() => setFlipped((turned) => !turned)}
                  aria-label={flipped ? 'Turn back to the front' : cardTicks.length > 0 ? 'Turn over to see the checklist' : 'Turn over'}
                  className={TEXT_BUTTON}
                >
                  {flipped ? 'Turn back' : 'Turn over'}
                </button>
              </div>

              <p className="mt-6 text-lg font-semibold tabular-nums text-white">+{earnedXp} XP</p>
              {result.playerXp && <LevelProgress {...result.playerXp} />}

              {/* Badges */}
              {existing.review?.badges.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {existing.review.badges.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xs border border-slate-600 text-sm font-medium text-white">
                      <ArtIcon icon={BADGES[b]?.art} className="w-4 h-4 text-rarity-legendary" />
                      {BADGES[b]?.label ?? b}
                      {result.newBadges.includes(b) && <span className="text-slate-400">New</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* A failed post explains itself here, and the answers are kept */}
        {saveError && (
          <p role="alert" className="mt-6 text-sm text-red-300 border border-red-400/40 rounded-sm px-4 py-2.5">
            {saveError}
            {saveErrorCode === 'EMAIL_NOT_CONFIRMED' && (
              <>
                {' '}
                <ResendEmailButton email={session?.user?.email} />
              </>
            )}
          </p>
        )}

        {/* Footer buttons */}
        <div className="mt-8">
          {step === 0 && (
            // Two ways on, each with its note underneath: the quest is the screen's main
            // action (lime), the quick review its ghost
            <div className="grid sm:grid-cols-2 gap-x-3 gap-y-4">
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={!answers.rating}
                  onClick={() => changeStep(QUICK)}
                  className={`${GHOST_BUTTON_TALL} w-full`}
                >
                  <Zap className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />Quick review
                </button>
                <span className="text-sm text-slate-400 text-center">Just the score and one line</span>
              </div>
              <div className="flex flex-col gap-1.5 row-start-1 sm:row-start-auto">
                <button
                  type="button"
                  disabled={!answers.rating}
                  onClick={() => changeStep(1)}
                  className={`${PRIMARY_BUTTON} w-full`}
                >
                  <Gamepad2 className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />{isEditing ? 'Edit the quest' : 'Start the quest'}
                </button>
                {/* The first time XP comes up in the quest, so it says what XP is for */}
                <span className="text-sm text-slate-400 text-center text-balance tabular-nums">{STEPS.length - 1} quick screens · up to {MAX_XP} XP toward your level</span>
              </div>
            </div>
          )}

          {/* Delete — only for an existing review, with an "are you sure?" step */}
          {step === 0 && isEditing && (
            <div className="mt-5 text-center">
              {confirmDelete ? (
                <div role="alertdialog" aria-label="Delete review?" className="text-left border border-red-400/40 bg-slate-950 rounded-sm p-4 animate-fade-in">
                  <p className="text-sm font-semibold text-white mb-1">Delete your review of {game.title}?</p>
                  <p className="text-sm text-slate-400 mb-3">Your answers and the badges it earned will be gone. This can't be undone.</p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className={GHOST_BUTTON_SM}
                    >
                      Keep it
                    </button>
                    {/* Red: the one place a button warns that something will be gone */}
                    <button
                      type="button"
                      onClick={removeReview}
                      disabled={deleting}
                      className="inline-flex items-center h-11 px-4.5 rounded-sm text-sm font-semibold bg-red-700 hover:bg-red-600 text-white transition-colors duration-120 disabled:opacity-50 disabled:cursor-wait"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete it'}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 h-11 text-sm font-medium text-slate-400 hover:text-red-300 transition-colors duration-120">
                  <Trash2 className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />Delete my review
                </button>
              )}
            </div>
          )}

          {isQuestScreen && step > 0 && (
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={skip} disabled={saving} className={TEXT_BUTTON}>
                Skip
              </button>
              <button type="button" onClick={goNext} disabled={saving} className={PRIMARY_BUTTON}>
                {step === LAST_STEP
                  ? (saving ? 'Posting…' : `${postWord} review`)
                  : <>Next <ArrowRight className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /></>}
              </button>
            </div>
          )}

          {step === QUICK && (
            <button type="button" onClick={post} disabled={saving} className={`${PRIMARY_BUTTON} w-full`}>
              {saving ? 'Posting…' : `${postWord} quick review`}
            </button>
          )}

          {step === DONE && (
            <div className="grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => changeStep(0)} className={`${GHOST_BUTTON_TALL} w-full`}>
                <Pencil className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />Edit my answers
              </button>
              <Link to={reviewLink} className={`${PRIMARY_BUTTON} w-full`}>
                See it on the game page
              </Link>
            </div>
          )}
        </div>

        {/* The way on: three more games to rate, and the quest's game search */}
        {step === DONE && <RateAnother gameId={game.id} />}
      </div>
    </QuestStage>
  );
};

// One quest per game: a new :id (e.g. "Rate another game" from the done screen) starts
// a fresh quest, rather than keeping the last game's answers and done screen
const ReviewQuest = () => {
  const { id } = useParams();
  return <Quest key={id} id={id} />;
};

export default ReviewQuest;
