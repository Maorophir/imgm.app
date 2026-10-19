/**
 * PlayNextTeaser — under the hero's buttons, what Play Next is, at a glance: a player's
 * request in their own words and the 5 games it would pick, framed like Play Next's
 * own cards: the Best Pick in Legendary gold, then Epic and Rare. It rotates through a few very different requests (lib/homeShowcase.js:
 * big story games, cozy, co-op), so it's clear Play Next handles any mood. The whole
 * panel opens Play Next.
 *
 * The rotation pauses while the pointer is over the panel or it has keyboard focus, and
 * doesn't run at all for people who ask their device for less motion.
 *
 * Phones get one line instead, so the hero's card stays on the first screen. On desktop
 * the panel floats over the key art under the hero's words (absolutely placed), so it
 * never makes that column taller: the card keeps its place and still fits the first
 * screen. Shown only to visitors who may use Play Next (the server decides: everyone once
 * it's open, its beta players before that). For a logged-in player it also wakes Play
 * Next's AI service, so their first answer doesn't wait for it to start.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePlayNextAccess } from '../../hooks/usePlayNextAccess';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useSession } from '../../lib/authClient';
import { wakeGuide } from '../../lib/api';
import { HOME_SHOWCASE } from '../../lib/homeShowcase';
import { igdbImage } from '../../lib/igdbImage';

const SAMPLES = HOME_SHOWCASE.playNext;
// The picks' frames, like Play Next's own cards: #1 Legendary (the Best Pick), #2 Epic,
// #3 Rare, the last two plain
const RING = ['ring-rarity-legendary', 'ring-rarity-epic', 'ring-rarity-rare'];
const ROTATE_EVERY = 4500; // ms per sample: long enough to read the request and see the covers

const PlayNextTeaser = () => {
  const { enabled } = usePlayNextAccess();
  const reduced = usePrefersReducedMotion();
  const { data: session } = useSession();
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);

  // A logged-in player may well open Play Next next: start its AI service now
  const loggedIn = Boolean(session);
  useEffect(() => {
    if (enabled && loggedIn) wakeGuide();
  }, [enabled, loggedIn]);

  useEffect(() => {
    if (!enabled || reduced || paused) return undefined;
    const timer = setInterval(() => setAt((i) => (i + 1) % SAMPLES.length), ROTATE_EVERY);
    return () => clearInterval(timer);
  }, [enabled, reduced, paused]);

  if (!enabled) return null;
  const { request, picks } = SAMPLES[at];

  return (
    <div className="lg:absolute lg:left-0 lg:top-full lg:w-[min(480px,100%)]">
      {/* Phones: one quiet line */}
      <Link
        to="/play-next"
        className="sm:hidden mt-5 inline-flex items-center gap-2 min-h-11 text-base font-medium text-white underline decoration-1 underline-offset-4 decoration-slate-500 hover:decoration-white"
      >
        <span className="text-brand" aria-hidden="true">✦</span>
        Not sure what to play? Ask Play Next
      </Link>

      {/* Tablets and up: the panel with a request and its picks, rotating */}
      <Link
        to="/play-next"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="group hidden sm:block mt-8 lg:mt-7 max-w-[480px] rounded-sm border border-slate-700 bg-slate-950/80 px-5 py-4 transition-colors duration-120 hover:border-white"
      >
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[.14em] text-brand">
          <span aria-hidden="true">✦</span> Play Next
        </p>
        <p className="mt-1.5 text-lg font-semibold leading-snug text-white">Stuck on the menu screen?</p>
        <p className="mt-1 text-sm text-slate-300">Tell Play Next your mood. Get 5 picks you'll actually want to play.</p>

        {/* The sample: what a player asked, and what came back (key replays the fade) */}
        <div key={at} className="mt-4 flex items-center gap-4 motion-safe:animate-fade-in">
          <p className="min-w-0 flex-1 rounded-sm bg-slate-900 border border-slate-700 px-3 py-2 text-sm italic text-slate-200">
            “{request}”
          </p>
          <ArrowRight className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
          <ul className="flex shrink-0" aria-label="Its 5 picks">
            {picks.map((pick, i) => (
              <li key={pick.title} className={i ? '-ml-3' : ''} style={{ zIndex: picks.length - i }}>
                <img
                  src={igdbImage(pick.cover, 't_cover_small')}
                  alt={pick.title}
                  title={pick.title}
                  className={`w-10 aspect-[3/4] object-cover rounded-xs ring-2 ${RING[i] ?? 'ring-slate-950'}`}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-base font-medium text-white underline decoration-1 underline-offset-4 decoration-slate-500 group-hover:decoration-white">
            Find my next game <ArrowRight className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
          {/* Which sample is on: one dash each, the current one lit */}
          <span className="flex gap-1.5" aria-hidden="true">
            {SAMPLES.map((sample, i) => (
              <span key={sample.request} className={`h-0.5 w-4 rounded-full transition-colors duration-300 ${i === at ? 'bg-white' : 'bg-slate-600'}`} />
            ))}
          </span>
        </div>
      </Link>
    </div>
  );
};

export default PlayNextTeaser;
