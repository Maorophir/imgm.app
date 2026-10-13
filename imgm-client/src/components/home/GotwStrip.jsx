/**
 * GotwStrip — the home page's look at Game of the Week, the reason to come back every
 * week. One calm section in two halves:
 *
 *   the winner   this week's Game of the Week: its cover in the Legendary gilt edge
 *                (as on the Game of the Week page, and nowhere else in the section),
 *                the days it holds the title, its name and "Chosen by IMGM players".
 *                The whole block opens the game page.
 *   the ballot   next week's vote: the candidates' small covers in a row, how long the
 *                vote stays open ("Voting closes in 4d 3h", ticking every minute), and
 *                a text link to the Game of the Week page, where the voting happens:
 *                "Vote for next week", or "See the ballot" once you've voted. The whole
 *                block is that link.
 *
 * Guests see it too: the Game of the Week page asks them to log in when they vote.
 *
 * It loads its own data (/api/gotw, the same answer the page gets). While that's on its
 * way, quiet placeholders keep the section's shape, so nothing under it jumps; if it
 * can't be loaded, the section steps aside. With no winner yet (the very first week)
 * the ballot stands alone; with an empty ballot the ballot half says so and still links
 * to the page; with neither, there's no section.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGotw } from '../../lib/api';
import { coverSrcSet } from '../../lib/igdbImage';
import { WRAP, TEXT_LINK, SECTION_TITLE } from '../../lib/ui';

// The Legendary gilt, as the 2px edge around the winner's cover (the same as the Game
// of the Week page's edge around the winner's art)
const GILT = { backgroundImage: 'var(--gradient-gilt)', backgroundSize: '260% 260%', backgroundPosition: '50% 50%' };

const DAY = 24 * 60 * 60 * 1000;

// The winner's cover: 112px on phones, 144px from tablets up (the gilt edge included)
const WINNER_COVER = 'w-28 sm:w-36';
// The ballot's covers: six in a row at every size, never wider than 440px in all
const BALLOT_ROW = 'grid grid-cols-6 gap-2 max-w-[440px]';

// Each half is one link: the link's ::after stretches over the half, so the cover can be
// clicked too, and the keyboard outline goes around the whole half (like the home page's
// review cards)
const HALF = 'relative min-w-0 has-[.gotw-link:focus-visible]:outline-2 has-[.gotw-link:focus-visible]:outline-offset-4 has-[.gotw-link:focus-visible]:outline-white';
const HALF_LINK = `gotw-link inline-flex items-center min-h-11 mt-1 text-base font-medium text-white after:absolute after:inset-0 focus-visible:outline-none ${TEXT_LINK}`;

const PLACEHOLDER = 'rounded-xs bg-slate-900 motion-safe:animate-pulse';

// "Oct 11" on Israel's calendar (the weeks run on it; the server says which time zone)
const day = (date, timeZone) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });

// "4d 3h" / "3h 12m" / "12m" until `endsAt`, ticking every minute (the Game of the Week
// page's clock). '' once the time's up: the next visit brings the new week's ballot.
const useTimeLeft = (endsAt) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  const minutes = Math.floor((new Date(endsAt) - now) / 60000);
  if (!(minutes > 0)) return '';
  const [d, h, m] = [Math.floor(minutes / 1440), Math.floor((minutes % 1440) / 60), minutes % 60];
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// This week's winner: the gilt-edged cover, "This week" and its dates (said in words, like
// the ballot's heading), the name, and the way to its page
const Winner = ({ gotw, timeZone }) => {
  const { game } = gotw;
  // It holds the title for seven days: from the Sunday the vote closed to the Saturday
  const reignEnds = new Date(new Date(gotw.reignsFrom).getTime() + 6 * DAY);
  return (
    <div className={`${HALF} flex items-start gap-5 sm:gap-8 animate-fade-in`}>
      <div className={`${WINNER_COVER} shrink-0 p-[2px] rounded-sm`} style={GILT}>
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            srcSet={coverSrcSet(game.coverUrl)}
            sizes="(min-width: 640px) 140px, 108px"
            alt=""
            loading="lazy"
            decoding="async"
            className="block w-full aspect-[3/4] object-cover rounded-xs bg-slate-950"
          />
        ) : (
          <div className="w-full aspect-[3/4] rounded-xs bg-slate-950" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm tabular-nums text-slate-400">
          This week · {day(gotw.reignsFrom, timeZone)} – {day(reignEnds, timeZone)}
        </p>
        <h3 className="mt-2 font-display text-[30px] sm:text-[44px] uppercase leading-[.92] tracking-[.005em] text-white text-balance break-words">
          {game.title}
        </h3>
        <p className="mt-3 text-base text-white">Chosen by IMGM players</p>
        <Link to={`/game/${game.id}`} className={HALF_LINK}>
          See the game<span className="sr-only">: {game.title}</span>
        </Link>
      </div>
    </div>
  );
};

// Next week's ballot: the candidates' covers, the time left, and the way to vote
const Ballot = ({ week, candidates, voted }) => {
  const timeLeft = useTimeLeft(week.endsAt);
  return (
    <div className={`${HALF} animate-fade-in`}>
      <h3 className="text-base font-semibold text-white">Next week's ballot</h3>
      {candidates.length > 0 ? (
        <>
          <ul aria-label="The games on the ballot" className={`mt-4 ${BALLOT_ROW}`}>
            {candidates.map(({ game }) => (
              <li key={game.id}>
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.title}
                    loading="lazy"
                    decoding="async"
                    className="block w-full aspect-[3/4] object-cover rounded-sm bg-slate-900"
                  />
                ) : (
                  <div role="img" aria-label={game.title} className="w-full aspect-[3/4] rounded-sm bg-slate-900" />
                )}
              </li>
            ))}
          </ul>
          {timeLeft && <p className="mt-4 text-sm tabular-nums text-slate-400">Voting closes in {timeLeft}</p>}
          <Link to="/game-of-the-week" className={HALF_LINK}>
            {voted ? 'See the ballot' : 'Vote for next week'}
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-400">The games for next week's vote aren't up yet.</p>
          <Link to="/game-of-the-week" className={HALF_LINK}>
            See Game of the Week
          </Link>
        </>
      )}
    </div>
  );
};

// While /api/gotw is on its way: the two halves' shapes, at the same sizes
const WinnerPlaceholder = () => (
  <div aria-hidden="true" className="flex items-start gap-5 sm:gap-8">
    <div className={`${WINNER_COVER} shrink-0 p-[2px] rounded-sm bg-slate-900 motion-safe:animate-pulse`}>
      <div className="aspect-[3/4]" />
    </div>
    <div className="flex-1 min-w-0">
      <div className={`h-5 w-28 ${PLACEHOLDER}`} />
      <div className={`mt-2 h-[55px] sm:h-10 w-3/4 max-w-[360px] ${PLACEHOLDER}`} />
      <div className={`mt-3 h-6 w-48 max-w-full ${PLACEHOLDER}`} />
      <div className={`mt-1 h-11 w-28 ${PLACEHOLDER}`} />
    </div>
  </div>
);

const BallotPlaceholder = () => (
  <div aria-hidden="true">
    <div className={`h-6 w-40 ${PLACEHOLDER}`} />
    <div className={`mt-4 ${BALLOT_ROW}`}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="aspect-[3/4] rounded-sm bg-slate-900 motion-safe:animate-pulse" />
      ))}
    </div>
    <div className={`mt-4 h-5 w-44 ${PLACEHOLDER}`} />
    <div className={`mt-1 h-11 w-40 ${PLACEHOLDER}`} />
  </div>
);

const GotwStrip = () => {
  // /api/gotw's answer: { week, candidates, myVote, gameOfTheWeek, … }. null = still
  // loading, false = it couldn't be loaded (the section then steps aside).
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getGotw(controller.signal)
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setData(false);
      });
    return () => controller.abort();
  }, []);

  if (data === false) return null;
  const loading = data === null;
  const winner = data?.gameOfTheWeek ?? null;
  // A candidate whose game the server couldn't find is left out, not shown as a blank
  const candidates = data?.candidates.filter((candidate) => candidate.game) ?? [];
  if (!loading && !winner && candidates.length === 0) return null;
  // Two halves side by side (on laptops), split by a hairline; the ballot alone when
  // there's no winner yet
  const halves = loading || Boolean(winner);

  return (
    <section aria-labelledby="gotw-title" aria-busy={loading} className="mt-30 sm:mt-50">
      <div className={WRAP}>
        <h2 id="gotw-title" className={SECTION_TITLE}>
          Game of the Week
        </h2>
        <p className="mt-5 max-w-[520px] text-base leading-[1.6] text-white">
          Every week IMGM players vote for one game. The winner is the Game of the Week for the seven days after.
        </p>

        <div
          className={`mt-10 sm:mt-12 ${
            halves ? 'grid gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12 xl:gap-x-16' : ''
          }`}
        >
          {loading ? <WinnerPlaceholder /> : winner && <Winner gotw={winner} timeZone={data.week.timeZone} />}
          <div className={halves ? 'min-w-0 border-t border-slate-700 pt-8 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-12 xl:pl-16' : ''}>
            {loading ? (
              <BallotPlaceholder />
            ) : (
              <Ballot week={data.week} candidates={candidates} voted={data.myVote != null} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GotwStrip;
