/**
 * Daily — Route: /daily, the daily Guess the game
 *
 * One game a day (Israel time), the same for everyone: guess it from a screenshot in
 * six tries. The first picture is a very blurred screenshot; each wrong guess unlocks a
 * new, clearer one, says how close the guess was (Verdict, and the tiles in GuessRow),
 * and after a few, gives a clue. A right guess stamps the picture. The server checks every guess (lib/daily.js), so the answer only arrives at
 * the end.
 *
 * A logged-in player's game is saved on the server (their streak, today's stats); a
 * logged-out player's stays in this browser (GAME, HISTORY) and is sent along with each
 * request. Logging in mid-game keeps it.
 *
 * Noir: the picture in a hairline frame, Big Shoulders headings, and lime only on the
 * page's main action: Guess while playing, then Rate the game once it's over.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, Clock, Flame, Lightbulb, Share2, X } from 'lucide-react';
import GamePicker from '../components/reviewQuest/GamePicker';
import LoadError from '../components/LoadError';
import { getDaily, giveUpDaily, guessDaily } from '../lib/api';
import { useSession } from '../lib/authClient';
// The browser's game today (also read by the home page's strip)
import { DAILY_GAME_KEY as GAME, localDailyGame as localGame, pictureStyle } from '../lib/dailyGame';
import { WRAP, SECTION_TITLE, PRIMARY_BUTTON, GHOST_BUTTON, GHOST_BUTTON_TALL, TEXT_LINK, TEXT_BUTTON_SM, LABEL } from '../lib/ui';

const HISTORY = 'imgm.daily.history'; // and their past days: { "2026-11-05": tries, … } (0 = not solved)
const SHARE_AT = 'imgm.app/daily';
const SHARED_FOR = 2000; // ms "Copied" stays up

// Storage can be blocked (private windows, strict settings): the game still plays
const readStore = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? null;
  } catch {
    return null;
  }
};
const writeStore = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* the game carries on without it */
  }
};

const dayBefore = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
};

// A logged-out player's streak: days in a row solved, still alive until today is lost
const guestStreak = (history, today) => {
  let day = today in history ? today : dayBefore(today);
  let streak = 0;
  while (history[day] > 0) {
    streak += 1;
    day = dayBefore(day);
  }
  return streak;
};

// "5h 12m", ticking every minute
const useTimeLeft = (until) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  if (!until) return '';
  const minutes = Math.max(0, Math.ceil((new Date(until) - now) / 60000));
  const [h, m] = [Math.floor(minutes / 60), minutes % 60];
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// The screenshot, blurred by the server's stage (pictureStyle). A wrong guess shakes
// the frame as its new picture comes in; a right one stamps it "Got it".
const Picture = ({ pictures, finished, solved, shake }) => {
  const [viewing, setViewing] = useState(null); // null = the newest
  const [loaded, setLoaded] = useState({});
  const index = viewing ?? pictures.length - 1;
  const picture = pictures[index];
  const { url } = picture;
  const total = finished ? pictures.length : 6;

  return (
    <div>
      <div className={`@container relative aspect-video overflow-hidden rounded-sm border bg-slate-900 ${solved ? 'border-(--color-rarity-uncommon)' : 'border-slate-600'} ${shake ? 'animate-shake' : ''}`}>
        <img
          key={url}
          src={url}
          alt={finished ? 'A screenshot of the game' : 'A blurred screenshot of the game to guess'}
          onLoad={() => setLoaded((l) => ({ ...l, [url]: true }))}
          draggable="false"
          className={`absolute inset-0 w-full h-full object-cover select-none transition-[filter,opacity] duration-300 ${loaded[url] ? 'opacity-100' : 'opacity-0'}`}
          style={pictureStyle(picture)}
        />
        {!loaded[url] && <div className="absolute inset-0 animate-pulse bg-slate-800" aria-hidden="true" />}
        {solved && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-sm bg-(--color-rarity-uncommon) text-slate-950 font-semibold animate-pop">
            <Check className="w-4.5 h-4.5" strokeWidth={2.6} aria-hidden="true" /> Got it
          </span>
        )}
        <span className="absolute left-2 bottom-2 sm:left-3 sm:bottom-3 text-xs sm:text-sm font-medium bg-slate-950/85 px-2.5 py-1 rounded-xs tabular-nums">
          {finished ? `Screenshot ${index + 1} of ${total}` : `Picture ${index + 1} of ${total}${index < 5 ? ': a new, clearer one with each try' : ''}`}
        </span>
      </div>
      {/* The earlier pictures stay to look back at */}
      {pictures.length > 1 && (
        <div className="flex gap-1.5 mt-2" role="group" aria-label="Pictures">
          {pictures.map((p, i) => (
            <button
              key={p.url + i}
              type="button"
              onClick={() => setViewing(i === pictures.length - 1 ? null : i)}
              aria-label={`Picture ${i + 1}`}
              aria-pressed={i === index}
              className={`h-11 min-w-11 px-3 rounded-sm border text-sm font-semibold tabular-nums transition-colors duration-120 ${
                i === index ? 'bg-white text-slate-950 border-white' : 'border-slate-600 text-white hover:bg-slate-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// How warm a wrong guess was, from what it shares with the answer: the same series is
// nearly there, the same studio is hot, a shared genre or a close year is warm
const heatOf = (guess) => {
  if (guess.sameSeries) return { word: 'So close', tone: 'close' };
  if (guess.sameStudio) return { word: 'Hot', tone: 'close' };
  if (guess.genres.length > 0 || guess.close || guess.answerIs === 'same') return { word: 'Warm', tone: 'warm' };
  return { word: 'Cold', tone: 'cold' };
};

// What a wrong guess tells the player, in a sentence: "It came out after 2011, and it's
// also Adventure."
const verdictLine = (guess) => {
  if (guess.sameSeries) {
    const when = guess.answerIs && guess.answerIs !== 'same' ? ` The one you're after came out ${guess.answerIs === 'newer' ? 'later' : 'earlier'}.` : '';
    return `Right series, another game in it.${when}`;
  }
  const when = guess.answerIs === 'same' ? `It came out the same year, ${guess.year}`
    : guess.answerIs === 'newer' ? `It came out ${guess.close ? 'a little ' : ''}after ${guess.year}`
      : guess.answerIs === 'older' ? `It came out ${guess.close ? 'a little ' : ''}before ${guess.year}` : null;
  const what = guess.genres.length ? `it's also ${guess.genres.slice(0, 2).join(' and ')}` : 'a different genre';
  const studio = guess.sameStudio ? ' Same studio, too.' : '';
  return `${when ? `${when}, and ${what}` : what.charAt(0).toUpperCase() + what.slice(1)}.${studio}`;
};

// The tones: a match is the Uncommon green, close is the Legendary gold, a miss stays
// grey (the rarity inks, so the page keeps the site's colours). `ink` is the text alone.
const TONE = {
  match: { box: 'border-(--color-rarity-uncommon) text-(--color-rarity-uncommon)', ink: 'text-(--color-rarity-uncommon)' },
  close: { box: 'border-(--color-rarity-legendary) text-(--color-rarity-legendary)', ink: 'text-(--color-rarity-legendary)' },
  warm: { box: 'border-(--color-rarity-legendary)/50 text-(--color-rarity-legendary)', ink: 'text-(--color-rarity-legendary)' },
  cold: { box: 'border-slate-600 text-slate-300', ink: 'text-slate-400' },
  miss: { box: 'border-slate-700 text-slate-400', ink: 'text-slate-400' },
};

// Right after a wrong guess: how warm it was in big words, what it told you, and that a
// new picture is up. Read out by screen readers; keyed by the guess, so each one pops in.
const Verdict = ({ guess, triesLeft }) => {
  const heat = heatOf(guess);
  return (
    <div role="status" className={`mt-5 p-4 sm:p-5 rounded-sm border bg-slate-900 animate-pop ${TONE[heat.tone].box}`}>
      <p className="font-display text-[30px] leading-none">{heat.word}</p>
      <p className="mt-2 text-base text-white">
        Not <span className="font-semibold">{guess.title}</span>. {verdictLine(guess)}
      </p>
      {triesLeft > 0 && (
        <p className="mt-1.5 text-sm text-slate-400">
          A new, clearer picture is up. {triesLeft} {triesLeft === 1 ? 'try' : 'tries'} left.
        </p>
      )}
    </div>
  );
};

// One tile in a guess's row: the label, then what the guess has
const Tile = ({ tone, label, children }) => (
  <span className={`flex flex-col justify-center min-w-0 px-2.5 py-1.5 rounded-xs border ${TONE[tone].box}`}>
    <span className="text-[11px] leading-tight text-slate-400">{label}</span>
    <span className="flex items-center gap-1 text-sm font-semibold leading-tight min-w-0">
      <span className="truncate">{children}</span>
    </span>
  </span>
);

// A guess and how close it was: tiles for genre, year, studio and series, green for a
// match, gold for close, grey for a miss ("↑ 2011": the answer came out after 2011)
const GuessRow = ({ guess, index }) => {
  const heat = guess.right ? null : heatOf(guess);
  const yearTone = guess.answerIs === 'same' ? 'match' : guess.close ? 'close' : 'miss';
  return (
    <li className="flex gap-3 py-3 border-t border-slate-700 first:border-t-0 animate-fade-in">
      <span className="w-4 pt-0.5 text-sm tabular-nums text-slate-400 shrink-0">{index + 1}</span>
      {guess.coverUrl
        ? <img src={guess.coverUrl} alt="" className="w-10 h-14 object-cover rounded-sm shrink-0 bg-slate-800" />
        : <div className="w-10 h-14 rounded-sm bg-slate-800 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="flex items-start gap-1.5 font-medium text-white leading-snug">
          {guess.right
            ? <Check className="w-4 h-4 mt-0.5 shrink-0 text-(--color-rarity-uncommon)" strokeWidth={2.4} aria-label="Right" />
            : <X className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" strokeWidth={2} aria-label="Wrong" />}
          <span className="min-w-0 flex-1">{guess.title}</span>
          <span className={`shrink-0 text-xs font-semibold uppercase tracking-[.06em] ${guess.right ? TONE.match.ink : TONE[heat.tone].ink}`}>
            {guess.right ? 'Got it' : heat.word}
          </span>
        </p>
        {!guess.right && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
            <Tile tone={guess.genres.length ? 'match' : 'miss'} label="Genre">
              {guess.genres.length ? guess.genres.slice(0, 2).join(', ') : 'None shared'}
            </Tile>
            <Tile tone={yearTone} label="Year">
              {guess.answerIs === 'newer' && <ArrowUp className="inline w-3.5 h-3.5 -mt-0.5 mr-0.5" strokeWidth={2.2} aria-label="The game came out after" />}
              {guess.answerIs === 'older' && <ArrowDown className="inline w-3.5 h-3.5 -mt-0.5 mr-0.5" strokeWidth={2.2} aria-label="The game came out before" />}
              <span className="tabular-nums">{guess.year ?? '?'}</span>
            </Tile>
            <Tile tone={guess.sameStudio ? 'match' : 'miss'} label="Studio">{guess.sameStudio ? 'Same' : 'Different'}</Tile>
            <Tile tone={guess.sameSeries ? 'match' : 'miss'} label="Series">{guess.sameSeries ? 'Same' : 'Different'}</Tile>
          </div>
        )}
      </div>
    </li>
  );
};

// The tries as a bar: a green hit, gold warm misses, grey cold ones, empty ones left
const TriesBar = ({ guesses, maxTries }) => (
  <div className="flex gap-1.5" aria-hidden="true">
    {Array.from({ length: maxTries }, (_, i) => {
      const guess = guesses[i];
      return (
        <span
          key={i}
          className={`flex-1 h-2.5 ${
            guess?.right ? 'bg-(--color-rarity-uncommon)'
              : guess ? (heatOf(guess).tone === 'cold' ? 'bg-slate-500' : 'bg-(--color-rarity-legendary)/70')
                : 'border border-slate-600'
          }`}
        />
      );
    })}
  </div>
);

// "IMGM daily #47: 3/6, 12-day streak. imgm.app/daily" (plain text, no spoilers)
const shareLine = (data, streak) => {
  const score = data.status === 'solved' ? `${data.guesses.length}/${data.maxTries}` : `X/${data.maxTries}`;
  return `IMGM daily #${data.number}: ${score}${streak >= 2 ? `, ${streak}-day streak` : ''}. ${SHARE_AT}`;
};

const ShareResult = ({ text }) => {
  const [status, setStatus] = useState('idle'); // 'copied' | 'failed'
  useEffect(() => {
    if (status === 'idle') return;
    const timer = setTimeout(() => setStatus('idle'), SHARED_FOR);
    return () => clearTimeout(timer);
  }, [status]);

  const share = async () => {
    // Phones: the share sheet. Elsewhere (or if it fails): copy the line
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };
  const message = status === 'copied' ? 'Copied' : status === 'failed' ? "Couldn't copy it" : '';

  return (
    <div>
      <button type="button" onClick={share} className={`${GHOST_BUTTON} w-full`}>
        <Share2 className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> {message || 'Share your result'}
      </button>
      <span role="status" className="sr-only">{message}</span>
      <p className="mt-2 text-sm text-slate-400 font-mono wrap-break-word">{text}</p>
    </div>
  );
};

// Once it's over: the answer, the result, sharing it, and rating the game (the page's
// lime from here on)
const Result = ({ data, streak }) => {
  const { answer, status, guesses, maxTries } = data;
  const solved = status === 'solved';
  return (
    <section className="rounded-sm border border-slate-600 bg-slate-900 p-5 sm:p-6 animate-fade-in" aria-live="polite">
      <p className={`flex items-center gap-2.5 font-display text-[36px] leading-none ${solved ? TONE.match.ink : 'text-white'}`}>
        {solved && <Check className="w-8 h-8 shrink-0" strokeWidth={2.6} aria-hidden="true" />}
        {solved ? (guesses.length === 1 ? 'Got it in one!' : `Got it in ${guesses.length}!`) : 'Not today'}
      </p>
      <p className="mt-2 text-base text-slate-300">
        {solved
          ? guesses.length <= 2 ? 'Sharp eyes.' : guesses.length <= 4 ? 'Nicely done.' : 'Just in time.'
          : 'This one was tough. A new game comes at midnight.'}
      </p>
      {streak >= 1 && solved && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300 tabular-nums">
          <Flame className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> {streak === 1 ? 'Day one of a streak' : `${streak} days in a row`}
        </p>
      )}
      <div className="mt-4"><TriesBar guesses={guesses} maxTries={maxTries} /></div>

      <div className="flex gap-4 items-center mt-5">
        {answer.coverUrl && <img src={answer.coverUrl} alt="" className="w-16 rounded-sm shrink-0" />}
        <div className="min-w-0">
          <p className={LABEL}>{solved ? 'It was' : 'The game was'}</p>
          <Link to={`/game/${answer.id}`} className={`text-lg font-semibold text-white leading-tight ${TEXT_LINK}`}>{answer.title}</Link>
          <p className="text-sm text-slate-400 mt-0.5">{[answer.year, answer.developers?.[0]].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-5">
        <Link to={`/game/${answer.id}/review`} className={`${PRIMARY_BUTTON} sm:flex-1`}>Played it? Rate it</Link>
        <Link to={`/game/${answer.id}`} className={`${GHOST_BUTTON_TALL} sm:flex-1`}>See the game</Link>
      </div>
      <div className="mt-5 pt-5 border-t border-slate-700">
        <ShareResult text={shareLine(data, streak)} />
      </div>
    </section>
  );
};

// How everyone did today (logged-in players who finished)
const Today = ({ today, mine }) => {
  if (!today) return null;
  const most = Math.max(1, ...today.byTries);
  return (
    <section className="border border-slate-700 rounded-sm p-5">
      <h2 className="font-semibold text-white">Today</h2>
      {today.players === 0 ? (
        <p className="text-sm text-slate-400 mt-2">You're one of the first to finish today.</p>
      ) : (
        <>
          <p className="text-sm text-slate-300 mt-2">
            <span className="font-semibold text-white tabular-nums">{today.solvedShare}%</span> of {today.players}{' '}
            {today.players === 1 ? 'player' : 'players'} got it{today.mostTries && <>, most in {today.mostTries}</>}
          </p>
          <ol className="mt-4 space-y-1.5">
            {today.byTries.map((n, i) => (
              <li key={i} className="flex items-center gap-2 text-sm tabular-nums">
                <span className="w-3 text-slate-400">{i + 1}</span>
                <span className="flex-1 h-4 bg-slate-800">
                  <span
                    className={`block h-full ${mine === i + 1 ? 'bg-white' : 'bg-slate-500'}`}
                    style={{ width: `${(n / most) * 100}%`, minWidth: n ? 4 : 0 }}
                  />
                </span>
                <span className="w-6 text-right text-slate-300">{n}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
};

const Record = ({ me, guestStreakDays, finished }) => {
  if (!me) {
    return (
      <section className="border border-slate-700 rounded-sm p-5">
        <h2 className="font-semibold text-white">Your streak</h2>
        <p className="mt-1 font-display text-[44px] leading-none tabular-nums">{guestStreakDays}</p>
        <p className="text-sm text-slate-400 mt-3">
          Kept in this browser only. <Link to="/login?redirect=%2Fdaily" className={`font-medium text-white ${TEXT_LINK}`}>Log in</Link> to
          keep your streak on any device{finished ? ' and count in today\'s results' : ''}.
        </p>
      </section>
    );
  }
  const winRate = me.played ? Math.round((me.won / me.played) * 100) : 0;
  return (
    <section className="border border-slate-700 rounded-sm p-5">
      <h2 className="font-semibold text-white">Your record</h2>
      <dl className="grid grid-cols-4 gap-2 mt-3 text-center">
        {[['Played', me.played], ['Won', `${winRate}%`], ['Streak', me.streak], ['Best', me.bestStreak]].map(([label, value]) => (
          <div key={label}>
            <dd className="font-display text-[32px] leading-none tabular-nums">{value}</dd>
            <dt className="text-xs text-slate-400 mt-1">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
};

const Clues = ({ clues, nextClueAfter, wrong }) => (
  <section className="border border-slate-700 rounded-sm p-5">
    <h2 className="flex items-center gap-2 font-semibold text-white">
      <Lightbulb className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> Clues
    </h2>
    {clues.length > 0 && (
      <dl className="mt-3 space-y-2">
        {clues.map((clue) => (
          <div key={clue.label} className="flex gap-3 text-sm">
            <dt className="w-20 shrink-0 text-slate-400">{clue.label}</dt>
            <dd className="text-white font-medium tabular-nums">{clue.value}</dd>
          </div>
        ))}
      </dl>
    )}
    {nextClueAfter != null && (
      <p className="text-sm text-slate-400 mt-3">
        {clues.length ? 'Another' : 'A clue'} after {nextClueAfter - wrong} more wrong {nextClueAfter - wrong === 1 ? 'guess' : 'guesses'}.
      </p>
    )}
  </section>
);

export default function Daily() {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [justGuessed, setJustGuessed] = useState(false); // the picture shakes after a miss, not on load
  const [history, setHistory] = useState(() => readStore(HISTORY) ?? {});
  const timeLeft = useTimeLeft(data?.nextAt);

  // A result from the server. A logged-out player's game is kept in this browser (and
  // their finished days, for the streak); a logged-in player's is on the server now.
  const apply = useCallback((result) => {
    setData(result);
    if (result.me) {
      writeStore(GAME, null);
      return;
    }
    const finished = result.status !== 'playing';
    writeStore(GAME, { day: result.day, guesses: result.played, gaveUp: result.status === 'failed' && result.played.length < result.maxTries });
    if (finished) {
      setHistory((old) => {
        const next = { ...old, [result.day]: result.status === 'solved' ? result.played.length : 0 };
        writeStore(HISTORY, next);
        return next;
      });
    }
  }, []);

  const load = useCallback((signal) => {
    const game = localGame();
    getDaily({ guesses: game?.guesses ?? [], gaveUp: Boolean(game?.gaveUp) }, signal)
      .then(apply)
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(true);
      });
  }, [apply]);

  // Again when the player logs in or out (logging in keeps the game they started)
  useEffect(() => {
    if (isPending) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [isPending, userId, load]);

  // The "Sure?" of giving up goes away by itself
  useEffect(() => {
    if (!confirmGiveUp) return;
    const timer = setTimeout(() => setConfirmGiveUp(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmGiveUp]);

  const fromBrowser = () => (data?.me ? undefined : data?.played ?? []);

  const guess = async (event) => {
    event.preventDefault();
    if (!picked || busy) return;
    setBusy(true);
    setError('');
    try {
      apply(await guessDaily(picked.id, fromBrowser()));
      setJustGuessed(true);
      setPicked(null);
    } catch (err) {
      setError(err.status === 429 ? 'Too many guesses. Wait a moment.' : err.message || "That guess didn't go through. Try again.");
      if (err.status === 409) load();
    } finally {
      setBusy(false);
    }
  };

  const giveUp = async () => {
    if (!confirmGiveUp) {
      setConfirmGiveUp(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      apply(await giveUpDaily(fromBrowser()));
    } catch {
      setError("Couldn't show the answer. Try again.");
    } finally {
      setBusy(false);
      setConfirmGiveUp(false);
    }
  };

  if (loadError) return <div className={`${WRAP} py-16`}><LoadError title="Couldn't load today's game" onRetry={() => { setLoadError(false); load(); }} /></div>;
  if (!data) {
    return (
      <div className={`${WRAP} py-10 sm:py-14`} aria-busy="true">
        <div className="h-5 w-48 bg-slate-800 animate-pulse mb-3" />
        <div className="h-12 w-72 bg-slate-800 animate-pulse mb-6" />
        <div className="aspect-video max-w-205 bg-slate-900 border border-slate-700 rounded-sm animate-pulse" />
      </div>
    );
  }

  const finished = data.status !== 'playing';
  const wrong = data.guesses.filter((g) => !g.right).length;
  const triesLeft = data.maxTries - data.guesses.length;
  const latest = data.guesses.at(-1);
  const streak = data.me ? data.me.streak : guestStreak(history, data.day);
  const myTries = data.status === 'solved' ? data.guesses.length : null;
  const dayLabel = new Date(`${data.day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <div className={`${WRAP} py-10 sm:py-14`}>
      <p className="text-sm text-slate-400 tabular-nums">Daily · #{data.number} · {dayLabel} · the same game for everyone</p>
      <h1 className={`${SECTION_TITLE} mt-2 mb-6 sm:mb-8`}>Guess the game</h1>

      <div className="grid gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 max-w-205">
          {/* A new picture (a wrong guess, or the end) starts the viewer on it */}
          <Picture
            key={`${data.status}:${data.pictures.length}`}
            pictures={data.pictures}
            finished={finished}
            solved={data.status === 'solved'}
            shake={!finished && justGuessed}
          />
          {!finished && latest && <Verdict key={latest.id} guess={latest} triesLeft={triesLeft} />}

          <div className="mt-6">
            {finished ? (
              <Result data={data} streak={streak} />
            ) : (
              <form onSubmit={guess}>
                <p className="text-sm text-slate-300 mb-2 tabular-nums">
                  {data.guesses.length === 0 ? 'What game is this? Six tries.' : `${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left`}
                </p>
                {/* The button matches the field's height: 44px, or the picked game's row */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                  <div className="flex-1 min-w-0">
                    <GamePicker value={picked} onChange={setPicked} excludeIds={data.played} placeholder="Type a game…" />
                  </div>
                  <button type="submit" disabled={!picked || busy} className={`${PRIMARY_BUTTON} sm:h-auto sm:min-h-11`}>
                    {busy ? 'Checking…' : 'Guess'}
                  </button>
                </div>
                {error && <p className="mt-2 text-sm text-red-400" role="alert">{error}</p>}
                <button type="button" onClick={giveUp} disabled={busy} className={`${TEXT_BUTTON_SM} mt-2`}>
                  {confirmGiveUp ? 'Sure? Show the answer' : 'Give up'}
                </button>
              </form>
            )}
          </div>

          {/* On a phone the clues come right under the guess (the side column is far below) */}
          {data.clues.length > 0 && (
            <div className="mt-6 lg:hidden">
              <Clues clues={data.clues} nextClueAfter={data.nextClueAfter} wrong={wrong} />
            </div>
          )}

          {data.guesses.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold text-white mb-1">Your guesses</h2>
              <ol>
                {data.guesses.map((g, i) => <GuessRow key={g.id} guess={g} index={i} />)}
              </ol>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 min-w-0">
          <div className={data.clues.length > 0 ? 'hidden lg:block' : ''}>
            <Clues clues={data.clues} nextClueAfter={data.nextClueAfter} wrong={wrong} />
          </div>
          {finished && <Today today={data.today} mine={myTries} />}
          <Record me={data.me} guestStreakDays={streak} finished={finished} />
          <p className="flex items-center gap-2 text-sm text-slate-400 tabular-nums">
            <Clock className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Next game in {timeLeft}
          </p>
        </aside>
      </div>
    </div>
  );
}
