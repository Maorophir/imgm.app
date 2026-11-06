/**
 * Daily — Route: /daily, the daily Guess the game
 *
 * One game a day (Israel time), the same for everyone: guess it from a screenshot in
 * six tries. The first picture is a blurred screenshot; each wrong guess makes it
 * clearer (the same screenshot sharper, then a new one), says how close the guess was (Verdict, and the tiles in GuessRow),
 * and after a few, gives a clue. Skip uses up a try without naming a game, for the
 * next picture and clues; skipping the last try shows the answer (it asks first). A right guess stamps the picture. The server checks every guess (lib/daily.js), so the answer only arrives at
 * the end.
 *
 * A logged-in player's game is saved on the server (their streak, today's stats); a
 * logged-out player's stays in this browser (GAME, HISTORY) and is sent along with each
 * request. Logging in mid-game keeps it.
 *
 * Noir: the picture in a hairline frame, Big Shoulders headings, and lime only on the
 * page's main action: Guess while playing, then Rate the game once it's over.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, Clock, Eye, EyeOff, Flame, Lightbulb, Share2, SkipForward, X } from 'lucide-react';
import GamePicker from '../components/reviewQuest/GamePicker';
import LoadError from '../components/LoadError';
import ShareCardDialog from '../components/share/ShareCardDialog';
import DailyShareImage from '../components/share/DailyShareImage';
import { blurredPicture } from '../lib/dailyShare';
import { getDaily, guessDaily, nativeTrailerUrl, skipDaily } from '../lib/api';
import { playsStreamsItself, releaseVideo } from '../components/discover/trailerVideo';
import { useSession } from '../lib/authClient';
// The browser's game today (also read by the home page's strip)
import { DAILY_GAME_KEY as GAME, localDailyGame as localGame, pictureStyle } from '../lib/dailyGame';
import { WRAP, SECTION_TITLE, PRIMARY_BUTTON, GHOST_BUTTON, GHOST_BUTTON_TALL, TEXT_LINK, TEXT_BUTTON_SM, LABEL } from '../lib/ui';

const HISTORY = 'imgm.daily.history'; // and their past days: { "2026-11-05": tries, … } (0 = not solved)

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

// The last try's picture when the game has a trailer: a few seconds from its middle
// (past the logos and age ratings), muted (a trailer's voice often says the game's
// name), on a loop, blurred as the server says (sharp once the game is over). The sharp screenshot shows until it plays, and stays if it can't.
// Steam's and Xbox's trailers are HLS: an iPhone plays them itself (our copy of the
// playlist, 480p first, as Discover does), other browsers through hls.js.
const CLIP_AT = 0.45; // where in the trailer the moment starts
const CLIP_SECONDS = 4;
const Clip = ({ src, style }) => {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const video = ref.current;
    let hls = null;
    let cancelled = false;
    let start = null;
    const onMeta = () => {
      if (!Number.isFinite(video.duration)) return;
      start = video.duration * CLIP_AT;
      video.currentTime = start;
      video.play().catch(() => {});
    };
    const onTime = () => {
      if (start != null && (video.currentTime > start + CLIP_SECONDS || video.currentTime < start - 1)) video.currentTime = start;
    };
    const onPlaying = () => setPlaying(true);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('playing', onPlaying);
    if (playsStreamsItself(video)) {
      video.src = nativeTrailerUrl(src);
      video.play().catch(() => {}); // an iPhone loads nothing until play()
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) return;
        hls = new Hls({ capLevelToPlayerSize: true });
        hls.loadSource(src);
        hls.attachMedia(video);
      });
    }
    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('playing', onPlaying);
      hls?.destroy();
      releaseVideo(video);
    };
  }, [src]);
  return (
    <video
      ref={ref}
      muted
      playsInline
      aria-hidden="true"
      style={style}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${playing ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

// The screenshot, blurred by the server's stage (pictureStyle). A wrong guess shakes
// the frame as its new picture comes in; a right one stamps it "Got it".
const Picture = ({ pictures, finished, solved, shake }) => {
  const [viewing, setViewing] = useState(null); // null = the newest
  const [loaded, setLoaded] = useState({});
  // Once it's over the pictures are the game's six, sharp; this shows them blurred again,
  // as they were played
  const [asPlayed, setAsPlayed] = useState(false);
  const index = viewing ?? pictures.length - 1;
  const shown = pictures[index];
  const picture = finished && asPlayed ? { ...shown, blur: shown.seenBlur } : shown;
  const { url } = picture;
  const total = 6;

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
        {picture.clip && <Clip key={picture.clip} src={picture.clip} style={pictureStyle(picture)} />}
        {solved && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-sm bg-(--color-rarity-uncommon) text-slate-950 font-semibold animate-pop">
            <Check className="w-4.5 h-4.5" strokeWidth={2.6} aria-hidden="true" /> Got it
          </span>
        )}
        <span className="absolute left-2 bottom-2 sm:left-3 sm:bottom-3 text-xs sm:text-sm font-medium bg-slate-950/85 px-2.5 py-1 rounded-xs tabular-nums">
          {`Picture ${index + 1} of ${total}${picture.news ? `: ${picture.news}` : ''}`}
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
      {finished && (
        <button type="button" onClick={() => setAsPlayed((on) => !on)} aria-pressed={asPlayed} className={`${TEXT_BUTTON_SM} inline-flex items-center gap-1.5 mt-2`}>
          {asPlayed ? <Eye className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> : <EyeOff className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
          {asPlayed ? 'Show them sharp' : 'Show them as you played them'}
        </button>
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
const Verdict = ({ guess, triesLeft, newShot, clip, newClue }) => {
  const nowPlaying = `${clip ? 'A moment of the game is playing.' : newShot ? 'A new screenshot is up.' : 'The picture is sharper now.'}${newClue ? ` New clue: ${newClue}, just below.` : ''}`;
  if (guess.skipped) {
    return (
      <div role="status" className="mt-5 p-4 sm:p-5 rounded-sm border border-slate-600 bg-slate-900 animate-pop">
        <p className="font-display text-[30px] leading-none text-white">Skipped</p>
        <p className="mt-2 text-base text-slate-300">
          {nowPlaying} {triesLeft} {triesLeft === 1 ? 'try' : 'tries'} left.
        </p>
      </div>
    );
  }
  const heat = heatOf(guess);
  return (
    <div role="status" className={`mt-5 p-4 sm:p-5 rounded-sm border bg-slate-900 animate-pop ${TONE[heat.tone].box}`}>
      <p className="font-display text-[30px] leading-none">{heat.word}</p>
      <p className="mt-2 text-base text-white">
        Not <span className="font-semibold">{guess.title}</span>. {verdictLine(guess)}
      </p>
      {triesLeft > 0 && (
        <p className="mt-1.5 text-sm text-slate-400">
          {nowPlaying} {triesLeft} {triesLeft === 1 ? 'try' : 'tries'} left.
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
  if (guess.skipped) {
    return (
      <li className="flex items-center gap-3 py-3 border-t border-slate-700 first:border-t-0 animate-fade-in">
        <span className="w-4 text-sm tabular-nums text-slate-400 shrink-0">{index + 1}</span>
        <span className="w-10 h-14 rounded-sm border border-dashed border-slate-600 shrink-0 flex items-center justify-center">
          <SkipForward className="w-4 h-4 text-slate-500" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="text-slate-400">Skipped</span>
      </li>
    );
  }
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
              : guess?.skipped ? 'bg-slate-700'
              : guess ? (heatOf(guess).tone === 'cold' ? 'bg-slate-500' : 'bg-(--color-rarity-legendary)/70')
                : 'border border-slate-600'
          }`}
        />
      );
    })}
  </div>
);

// The line that goes with the picture: "Guess the game #47: 3/6, 12-day streak." (the
// share window adds the link; never a spoiler)
const shareLine = (data, streak) => {
  const score = data.status === 'solved' ? `${data.guesses.length}/${data.maxTries}` : `X/${data.maxTries}`;
  return `Guess the game #${data.number} on IMGM: ${score}${streak >= 2 ? `, ${streak}-day streak` : ''}.`;
};

// Each try as the share picture's block: the hit, a skip, or how warm a miss was
const toneOf = (guess) =>
  guess.right ? 'hit' : guess.skipped ? 'skip' : { close: 'hot', warm: 'warm', cold: 'cold' }[heatOf(guess).tone];

// "Share your result": the result as a picture (DailyShareImage: the day's first picture
// blurred as the game starts it, never the answer) in the review card's share window
// (Share image, Save, Copy link, WhatsApp, X). The blur is made once, on the first tap.
const ShareResult = ({ data, streak }) => {
  const [open, setOpen] = useState(false);
  const [picture, setPicture] = useState(null);
  const [preparing, setPreparing] = useState(false);

  const share = async () => {
    if (picture == null) {
      setPreparing(true);
      try {
        setPicture(await blurredPicture(data.pictures[0].url));
      } catch {
        setPicture(''); // the picture's frame stays empty; the rest still shares
      } finally {
        setPreparing(false);
      }
    }
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={share} disabled={preparing} className={`${GHOST_BUTTON} w-full`}>
        <Share2 className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> {preparing ? 'Making your picture…' : 'Share your result'}
      </button>
      <ShareCardDialog
        open={open}
        onClose={() => setOpen(false)}
        url="/daily"
        title={`Guess the game #${data.number}`}
        text={shareLine(data, streak)}
        image={{
          heading: 'Share your result',
          alt: `Your result for Guess the game #${data.number}, as a picture`,
          fileName: `imgm-daily-${data.number}.png`,
          making: 'Making your picture…',
          element: (
            <DailyShareImage
              number={data.number}
              tries={data.guesses.map(toneOf)}
              maxTries={data.maxTries}
              solved={data.status === 'solved'}
              streak={streak}
              picture={picture || null}
            />
          ),
        }}
      />
    </>
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
        <ShareResult data={data} streak={streak} />
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

// The clues, right under the picture (the user, who owns the site, didn't notice them in
// the side column, 2026-11-06): a framed box with a count, the one just unlocked marked
// New, a quote as a quote, and what's still to come
const CLUE_COUNT = 4;
// A clue in the verdict's sentence ("New clue: release year, just below."), as the
// picture captions say it
const CLUE_WORDS = { Genre: 'genre', Released: 'release year', Quote: 'a line from the game', On: 'platforms', Studio: 'studio' };
const NewTag = () => (
  <span className="ml-2 inline-flex items-center h-5 px-1.5 rounded-xs bg-white text-slate-950 text-[11px] font-semibold uppercase tracking-[.06em] align-middle">New</span>
);
const Clues = ({ clues, nextClueAfter, wrong, quoteSource }) => (
  <section className="border border-slate-500 bg-slate-900 rounded-sm p-4 sm:p-5" aria-labelledby="clues-title">
    <h2 id="clues-title" className="flex items-center justify-between gap-3 font-semibold text-white">
      <span className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-(--color-rarity-legendary)" strokeWidth={1.8} aria-hidden="true" /> Clues
      </span>
      <span className="text-sm font-medium text-slate-400 tabular-nums">{clues.length} of {CLUE_COUNT}</span>
    </h2>
    {clues.length > 0 && (
      <dl className="mt-3 space-y-2.5">
        {clues.map((clue) => (clue.quote ? (
          <div key={clue.label} className={`text-sm pt-1 ${clue.fresh ? 'animate-pop' : ''}`}>
            <dt className="text-slate-400">A line from the game{clue.fresh && <NewTag />}</dt>
            <dd className="mt-1.5 pl-3 border-l-2 border-slate-500 font-serif italic text-base text-white leading-snug">“{clue.value}”</dd>
            {quoteSource && (
              <dd className="mt-1 pl-3 text-xs text-slate-400">
                From <a href={quoteSource} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>Wikiquote</a> (CC BY-SA)
              </dd>
            )}
          </div>
        ) : (
          <div key={clue.label} className={`flex gap-3 text-sm ${clue.fresh ? 'animate-pop' : ''}`}>
            <dt className="w-20 shrink-0 text-slate-400">{clue.label}</dt>
            <dd className="text-white font-medium tabular-nums">{clue.value}{clue.fresh && <NewTag />}</dd>
          </div>
        )))}
      </dl>
    )}
    {nextClueAfter != null && (
      <p className="text-sm text-slate-400 mt-3">
        {clues.length ? 'Another' : 'The first clue'} after {nextClueAfter - wrong} more {nextClueAfter - wrong === 1 ? 'try' : 'tries'} (a wrong guess or a skip).
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
  const [confirmLastSkip, setConfirmLastSkip] = useState(false); // skipping the last try ends the game: "Sure?" first
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
    writeStore(GAME, { day: result.day, guesses: result.played });
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
    getDaily({ guesses: game?.guesses ?? [] }, signal)
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

  // The "Sure?" of skipping the last try goes away by itself
  useEffect(() => {
    if (!confirmLastSkip) return;
    const timer = setTimeout(() => setConfirmLastSkip(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmLastSkip]);

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

  const skip = async () => {
    const last = data.maxTries - data.guesses.length === 1;
    if (last && !confirmLastSkip) {
      setConfirmLastSkip(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      apply(await skipDaily(fromBrowser()));
      setJustGuessed(true);
    } catch (err) {
      setError(err.status === 429 ? 'Too many tries. Wait a moment.' : err.message || "Couldn't skip. Try again.");
      if (err.status === 409) load();
    } finally {
      setBusy(false);
      setConfirmLastSkip(false);
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
  // Whether the last miss brought a new screenshot or the same one sharper (an image's
  // id is the end of its address; the size in it changes)
  const shotOf = (picture) => picture?.url.split('/').pop();
  const newShot = data.pictures.length > 1 && shotOf(data.pictures.at(-1)) !== shotOf(data.pictures.at(-2));
  const streak = data.me ? data.me.streak : guestStreak(history, data.day);
  const myTries = data.status === 'solved' ? data.guesses.length : null;
  const dayLabel = new Date(`${data.day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <div className={`${WRAP} py-10 sm:py-14`}>
      <p className="text-sm text-slate-400 tabular-nums">Daily · {dayLabel} · the same game for everyone</p>
      <h1 className={`${SECTION_TITLE} mt-2 mb-6 sm:mb-8`}>Guess the game <span className="tabular-nums text-slate-400">#{data.number}</span></h1>

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
          {!finished && latest && (
            <Verdict
              key={data.guesses.length}
              guess={latest}
              triesLeft={triesLeft}
              newShot={newShot}
              clip={Boolean(data.pictures.at(-1)?.clip)}
              newClue={CLUE_WORDS[data.clues.find((clue) => clue.fresh)?.label]}
            />
          )}
          <div className="mt-5">
            <Clues clues={data.clues} nextClueAfter={data.nextClueAfter} wrong={wrong} quoteSource={data.quoteSource} />
          </div>

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
                <button type="button" onClick={skip} disabled={busy} className={`${TEXT_BUTTON_SM} inline-flex items-center gap-1.5 mt-2`}>
                  <SkipForward className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                  {triesLeft > 1 ? 'Skip (uses a try)' : confirmLastSkip ? 'Sure? This shows the answer' : 'Skip your last try'}
                </button>
              </form>
            )}
          </div>

          {data.guesses.length > 0 && (
            <section className="mt-6">
              <h2 className="font-semibold text-white mb-1">Your guesses</h2>
              <ol>
                {data.guesses.map((g, i) => <GuessRow key={`${i}:${g.id}`} guess={g} index={i} />)}
              </ol>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 min-w-0">
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
