/**
 * SortYourPicks — one screen to answer all 5 picks at once, instead of a search per
 * card. Each pick is a collectible card framed by its rank (#1 the Best Pick in gilt,
 * #2 Epic, #3 Rare, #4 and #5 plain), with the game's IMGM score as the big number and
 * its Hall of Fame rank in the footer when it has one.
 *
 * On each card: Keep it, Played it (then "Did you like it?") or Not for me, plus Add to
 * Backlog (saved at once). Untouched cards count as kept. Done sends ONE message that
 * replaces only the played and rejected games, e.g. "I already played Unpacking (loved
 * it). Portal 2 isn't for me. Keep A Short Hike, Beacon Pines and A Little to the Left,
 * and replace the other 2." With every card kept, Done just closes: nothing to search.
 *
 * Desktop shows the 5 side by side; phones deal them one at a time (a choice moves on
 * to the next card). Esc or the close button leaves without sending anything.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { getTopGames } from '../../lib/api';
import { getRarity } from '../reviewQuest/questOptions';
import { PRIMARY_BUTTON } from '../../lib/ui';
import BacklogButton from '../BacklogButton';
import RarityMark from '../RarityMark';
import { sortMessage } from './sortMessage';

// The frame for each rank, like the pick cards: #1 Legendary, #2 Epic, #3 Rare, then plain
const RANK_TIER = { 1: getRarity(10), 2: getRarity(8), 3: getRarity(6) };
const PLAIN = { key: 'plain', color: '#5b564e', deep: '#1c1a17' };

// The Legendary frame's gilt (the same one the collectible cards use)
const GILT = { backgroundImage: 'var(--gradient-gilt)', backgroundSize: '260% 260%', backgroundPosition: '50% 50%' };

const HAIRLINE = 'border-white/14';

// The stamp across a card's art once it's sorted out
const Stamp = ({ children, sub }) => (
  <span className="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden="true">
    <span className="-rotate-8 px-[3cqi] py-[1.4cqi] rounded-xs border-2 border-white bg-slate-950/85 text-center">
      <span className="block font-display uppercase text-[length:7cqi] leading-none tracking-[.04em] text-white">{children}</span>
      {sub && <span className="block mt-[.8cqi] text-[length:max(10px,3.2cqi)] text-slate-300">{sub}</span>}
    </span>
  </span>
);

// One choice under a card
const Choice = ({ active, onClick, children, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    className={`flex-1 inline-flex items-center justify-center gap-1 h-10 px-1.5 rounded-sm border text-xs font-medium whitespace-nowrap transition-colors duration-120 ${
      active ? 'border-white bg-white text-slate-950' : 'border-slate-600 text-white hover:border-white'
    }`}
  >
    {children}
  </button>
);

const SortCard = ({ pick, rank, hofRank, choice, liked, onChoose, onLike }) => {
  const [open, setOpen] = useState(false);
  const tier = RANK_TIER[rank] ?? PLAIN;
  const legendary = rank === 1;
  const score = pick.rating ? Number(pick.rating) : null;
  const scoreRarity = score ? getRarity(score) : null;
  const out = choice === 'played' || choice === 'no';
  const meta = [pick.year, pick.hours && `~${pick.hours}h`].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-2 min-w-0 lg:grid lg:row-span-3 lg:grid-rows-subgrid">
      <div className="@container lg:h-full">
        <article
          aria-label={`Pick ${rank}: ${pick.title}`}
          className={`relative h-full flex flex-col rounded-[2.4cqi] p-[2cqi] bg-slate-900 inset-ring inset-ring-white/7 transition-opacity duration-160 ${choice === 'no' ? 'opacity-60' : ''}`}
          style={{ '--ink': tier.color, '--deep': tier.deep }}
        >
          {/* The frame: the rank's ink (gilt for the Best Pick) around the face */}
          <div
            className={`flex-1 flex flex-col rounded-[1.8cqi] ${legendary ? 'p-[1.3cqi]' : 'p-[max(1px,.6cqi)] bg-(--ink)'}`}
            style={legendary ? GILT : undefined}
          >
            <div className="flex-1 flex flex-col rounded-[1.4cqi] bg-slate-900 pt-[3cqi] px-[3.4cqi] pb-[2.6cqi]">
              {/* Title and the IMGM score */}
              <div className="flex items-start justify-between gap-[3cqi]">
                <h3 className="min-w-0 mt-[.6cqi] font-display text-[length:9.5cqi] leading-[.9] tracking-[.01em] uppercase text-balance break-words line-clamp-3">
                  {pick.title}
                </h3>
                {score ? (
                  <p className="flex items-baseline gap-[.8cqi] shrink-0" title={`IMGM score: ${score.toFixed(1)}`}>
                    <span className="font-display text-[length:16cqi] leading-[.78]" style={{ color: scoreRarity.color }}>
                      {Number.isInteger(score) ? score : score.toFixed(1)}
                    </span>
                    <span className="text-[length:max(9px,3cqi)] tabular-nums text-slate-400">/10</span>
                  </p>
                ) : (
                  <span className="shrink-0 mt-[.6cqi] px-[1.6cqi] py-[.6cqi] rounded-xs border border-slate-600 text-[length:max(9px,2.8cqi)] tracking-[.1em] uppercase text-slate-400">
                    Unrated
                  </span>
                )}
              </div>
              {meta && (
                <p className={`mt-[2cqi] pb-[1.8cqi] border-b-[length:max(1px,.22cqi)] ${HAIRLINE} text-[length:max(10px,3.4cqi)] tabular-nums text-slate-400`}>
                  {meta}
                </p>
              )}

              {/* The art window, with the stamp once it's sorted out */}
              <div className="relative mt-[2.4cqi] aspect-[16/10] rounded-[.6cqi] overflow-hidden bg-(--deep)">
                {pick.cover ? (
                  <img
                    src={pick.cover}
                    alt=""
                    loading="lazy"
                    className={`w-full h-full object-cover object-[50%_22%] transition-[filter] duration-160 ${choice === 'no' ? 'grayscale' : ''}`}
                  />
                ) : (
                  <span className="w-full h-full grid place-items-center" aria-hidden="true">
                    <RarityMark tier={rank <= 3 ? tier.key : 'junk'} thin className="w-[24cqi] h-[24cqi] text-(--ink)" />
                  </span>
                )}
                <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_max(1px,.25cqi)_color-mix(in_srgb,var(--ink)_42%,transparent)]" />
                {choice === 'played' && (
                  <Stamp sub={liked === true ? 'Loved it' : liked === false ? "Didn't enjoy it" : null}>Played</Stamp>
                )}
                {choice === 'no' && <Stamp>Not for me</Stamp>}
                {choice === 'keep' && (
                  <span className="absolute top-[2cqi] right-[2cqi] grid place-items-center w-[9cqi] h-[9cqi] min-w-6 min-h-6 rounded-xs bg-white text-slate-950" aria-hidden="true">
                    <Check className="w-[60%] h-[60%]" strokeWidth={2.4} />
                  </span>
                )}
              </div>

              {/* The rank's tier, and Best pick / Pick #N */}
              <div className="mt-[2.2cqi] flex items-center justify-between gap-[2cqi] text-[length:max(10px,3.4cqi)] leading-none">
                <span className="inline-flex items-center gap-[1.4cqi] font-semibold text-(--ink)">
                  {rank <= 3 && <RarityMark tier={tier.key} className="w-[3.8cqi] h-[3.8cqi] min-w-2.5 min-h-2.5" />}
                  {rank <= 3 ? tier.label : <span className="text-slate-300">Pick #{rank}</span>}
                </span>
                <span className="inline-flex items-center gap-[1cqi] text-slate-400">
                  {legendary ? <><Star className="w-[3.4cqi] h-[3.4cqi] min-w-2.5 min-h-2.5" strokeWidth={2} aria-hidden="true" /> Best pick</> : rank <= 3 && `Pick #${rank}`}
                </span>
              </div>

              {/* Why Play Next picked it (plain text: italics were hard to read here) */}
              <div className="flex-1 mt-[2.4cqi] text-[length:max(12px,3.8cqi)] leading-snug text-slate-200">
                <p className={open ? '' : 'line-clamp-4'}>{pick.why}</p>
                {(pick.why?.length ?? 0) > 120 && (
                  <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-expanded={open}
                    className="mt-1 min-h-8 text-[length:max(12px,3.4cqi)] font-medium text-slate-400 hover:text-white transition-colors duration-120"
                  >
                    {open ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>

              {/* The small print: IMGM's verdict, and its Hall of Fame rank */}
              <p className={`mt-[2.4cqi] pt-[1.6cqi] flex justify-between gap-[2cqi] border-t-[length:max(1px,.22cqi)] ${HAIRLINE} text-[length:max(10px,3cqi)] leading-tight text-slate-400`}>
                <span className="min-w-0 truncate">
                  {score ? (
                    <>
                      IMGM <span className="font-semibold" style={{ color: scoreRarity.color }}>{scoreRarity.label}</span>
                      {pick.review_count > 0 && ` · ${pick.review_count} review${pick.review_count === 1 ? '' : 's'}`}
                    </>
                  ) : (
                    'No IMGM reviews yet'
                  )}
                </span>
                {hofRank && <span className="shrink-0 text-white">#{hofRank} Hall of Fame</span>}
              </p>
            </div>
          </div>
        </article>
      </div>

      {/* The choices */}
      <div className="flex gap-1.5" role="group" aria-label={`What about ${pick.title}?`}>
        <Choice active={choice === 'keep'} onClick={() => onChoose('keep')} label={`Keep ${pick.title}`}>
          <Check className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" /> Keep it
        </Choice>
        <Choice active={choice === 'played'} onClick={() => onChoose('played')} label={`Played ${pick.title}`}>
          Played it
        </Choice>
        <Choice active={choice === 'no'} onClick={() => onChoose('no')} label={`${pick.title} is not for me`}>
          Not for me
        </Choice>
      </div>
      {choice === 'played' ? (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-300 mr-auto">Did you like it?</span>
          <Choice active={liked === true} onClick={() => onLike(true)} label={`I liked ${pick.title}`}>
            <ThumbsUp className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
          </Choice>
          <Choice active={liked === false} onClick={() => onLike(false)} label={`I didn't like ${pick.title}`}>
            <ThumbsDown className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
          </Choice>
        </div>
      ) : (
        <div>{!out && <BacklogButton gameId={pick.game_id} source="play_next" />}</div>
      )}
    </div>
  );
};

const SortYourPicks = ({ picks, onDone, onClose }) => {
  const [choices, setChoices] = useState({}); // game id → 'keep' | 'played' | 'no'
  const [liked, setLiked] = useState({}); // game id → true | false (for played games)
  const [at, setAt] = useState(0); // phones: the card being shown
  const [hof, setHof] = useState(new Map()); // game id → Hall of Fame rank
  const headingRef = useRef(null);

  // The Hall of Fame, to print each pick's rank on its card (a nice touch: no rank, no line)
  useEffect(() => {
    const controller = new AbortController();
    getTopGames({ sort: 'rank' }, controller.signal)
      .then((data) => setHof(new Map(data.games.map((g) => [g.id ?? g.gameId, g.rank]))))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Esc closes; the page behind doesn't scroll; focus starts on the heading
  useEffect(() => {
    const before = document.activeElement;
    headingRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [onClose]);

  const message = useMemo(() => sortMessage(picks, choices, liked), [picks, choices, liked]);
  const replacing = picks.filter((p) => ['played', 'no'].includes(choices[p.game_id])).length;

  // Phones: a choice deals the next card (a played game waits for "Did you like it?")
  const next = (i) => setTimeout(() => setAt((a) => (a === i ? Math.min(i + 1, picks.length - 1) : a)), 260);
  const choose = (i, pick, choice) => {
    setChoices((c) => ({ ...c, [pick.game_id]: choice }));
    if (choice !== 'played') next(i);
  };
  const like = (i, pick, value) => {
    setLiked((l) => ({ ...l, [pick.game_id]: value }));
    next(i);
  };

  const card = (pick, i) => (
    <SortCard
      key={pick.game_id}
      pick={pick}
      rank={i + 1}
      hofRank={hof.get(pick.game_id)}
      choice={choices[pick.game_id]}
      liked={liked[pick.game_id]}
      onChoose={(choice) => choose(i, pick, choice)}
      onLike={(value) => like(i, pick, value)}
    />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sort-picks-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="min-h-full flex items-start lg:items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-[1400px] rounded-sm border border-slate-700 bg-slate-950 shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)]">
          <header className="flex items-start justify-between gap-4 px-5 sm:px-8 pt-6 pb-4">
            <div>
              <h2 id="sort-picks-title" ref={headingRef} tabIndex={-1} className="font-display text-[34px] sm:text-[44px] leading-[.95] uppercase text-white outline-none">
                Sort your picks
              </h2>
              <p className="mt-1.5 text-slate-300">Tell me which ones fit. I'll replace the rest in one go.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close without changes"
              className="shrink-0 w-11 h-11 grid place-items-center rounded-sm border border-slate-600 text-slate-300 hover:border-white hover:text-white transition-colors duration-120"
            >
              <X className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </header>

          {/* Desktop: all five side by side */}
          {/* Three shared rows (cards, choices, extras): every card is as tall as the tallest */}
          <div className="hidden lg:grid grid-cols-5 grid-rows-[auto_auto_auto] gap-x-4 gap-y-2 px-8 pb-6">{picks.map(card)}</div>

          {/* Phones and tablets: one card at a time */}
          <div className="lg:hidden px-5 pb-4">
            <nav aria-label="Cards" className="mb-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAt((a) => Math.max(0, a - 1))}
                disabled={at === 0}
                aria-label="Previous card"
                className="w-11 h-11 grid place-items-center rounded-sm border border-slate-600 text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
              {/* One mark per card: where you are, and which are sorted */}
              <span className="flex gap-1.5">
                {picks.map((pick, i) => (
                  <button
                    key={pick.game_id}
                    type="button"
                    onClick={() => setAt(i)}
                    aria-label={`Card ${i + 1}: ${pick.title}`}
                    aria-current={i === at ? 'true' : undefined}
                    className="w-6 h-11 grid place-items-center"
                  >
                    <span
                      className={`h-1 rounded-full transition-all duration-160 ${i === at ? 'w-6 bg-white' : 'w-3'} ${
                        i !== at && ['played', 'no'].includes(choices[pick.game_id]) ? 'bg-slate-400' : i !== at ? 'bg-slate-600' : ''
                      }`}
                    />
                  </button>
                ))}
              </span>
              <button
                type="button"
                onClick={() => setAt((a) => Math.min(picks.length - 1, a + 1))}
                disabled={at === picks.length - 1}
                aria-label="Next card"
                className="w-11 h-11 grid place-items-center rounded-sm border border-slate-600 text-white disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </nav>
            <div className="mx-auto w-[min(340px,100%)]">{card(picks[at], at)}</div>
          </div>

          <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-4 border-t border-slate-700 bg-slate-950">
            <p className="text-sm text-slate-300" aria-live="polite">
              {replacing === 0
                ? 'Untouched cards are kept.'
                : `Keeping ${picks.length - replacing}, replacing ${replacing}.`}
            </p>
            <button
              type="button"
              onClick={() => (message ? onDone(message) : onClose())}
              className={`${PRIMARY_BUTTON} max-sm:w-full`}
            >
              {replacing === 0 ? 'Keep all 5' : `Replace ${replacing}`}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SortYourPicks;
