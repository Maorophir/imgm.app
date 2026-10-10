/**
 * Play Next — Route: /play-next (the old /guide redirects here)
 *
 * The AI recommendation chat. A new chat starts with the "Find my game" quest; then
 * the guide shows its work live (a step timeline, the games it considers), then
 * lands on 5 picks with one Best Pick in the side panel (inline on small screens).
 * Large screens get an app-like layout: the page fits the window, the chat scrolls
 * inside its own panel, and the composer stays pinned at its bottom.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../lib/authClient";
import { useGameGuide, MAX_QUESTIONS } from "../hooks/useGameGuide";
import { getFeaturedGames, wakeGuide } from "../lib/api";
import GuideTurn from "../components/guide/GuideTurn";
import GuidePanel from "../components/guide/GuidePanel";
import GuideComposer from "../components/guide/GuideComposer";
import FindMyGame from "../components/guide/FindMyGame";
import ChatHistory from "../components/guide/ChatHistory";
import PlayNextBackdrop from "../components/guide/PlayNextBackdrop";
import { PowerIcon } from "../components/Logo";

// The quest's answers, remembered in this browser for "Use my last answers"
const lastAnswersKey = (userId) => `imgm:play-next:last-answers:${userId}`;
const readLastAnswers = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(lastAnswersKey(userId)));
  } catch {
    return null; // private window / blocked storage: no shortcut, the quest still works
  }
};
const keepLastAnswers = (userId, answers) => {
  try {
    localStorage.setItem(lastAnswersKey(userId), JSON.stringify(answers));
  } catch {
    // not saved: next time they answer the quest again
  }
};

function GameGuide() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <PowerIcon className="w-12 h-12 text-brand mx-auto mb-4" />
        <h1 className="font-display text-5xl uppercase tracking-tight text-white mb-3">
          Play Next<span className="text-brand">.</span>
        </h1>
        <p className="text-slate-400 mb-8">
          Tell it what you're in the mood for. It reads your reviews and what
          IMGM players say, then picks your next 5 games.
        </p>
        <Link
          to="/login?redirect=%2Fplay-next"
          className="px-6 py-3 rounded-full font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition"
        >
          Log in to start
        </Link>
      </div>
    );
  }

  // key: another player logging in on this tab gets their own chat, never this one
  return <PlayNextChat key={session.user.id} userId={session.user.id} />;
}

function PlayNextChat({ userId }) {
  const guide = useGameGuide(userId);
  const {
    chatId,
    turns,
    current,
    running,
    full,
    prefs,
    setPrefs,
    ask,
    notForMe,
    newChat,
  } = guide;
  const [historyOpen, setHistoryOpen] = useState(false); // smaller screens: the chats list
  const [lastAnswers, setLastAnswers] = useState(() => readLastAnswers(userId));
  const bottomRef = useRef(null);
  // Only the questions actually answered are sent (empty lists and un-picks dropped)
  const preferences = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(prefs).filter(([, v]) =>
          Array.isArray(v) ? v.length > 0 : Boolean(v),
        ),
      ),
    [prefs],
  );
  // The chat's actions keep one identity while an answer streams in, so the earlier
  // turns (memo) don't re-render for every piece of text
  const onNotForMe = useCallback(
    (pick, reason) => notForMe(pick, preferences, reason),
    [notForMe, preferences],
  );
  const onAsk = useCallback(
    (question) => ask(question, preferences),
    [ask, preferences],
  );
  const { editLast } = guide;
  const onEdit = useCallback(
    (question) => editLast(question, preferences),
    [editLast, preferences],
  );

  // Wake the AI service while the player is still typing (it sleeps when unused)
  useEffect(() => {
    wakeGuide();
  }, []);

  // Keep the newest activity in view as the guide works: a smooth glide for each new
  // step or the cards, an instant one while the text streams (restarting a smooth
  // scroll for every few words made the typing look jerky)
  const milestone = current
    ? `${current.steps.length}-${Boolean(current.answer)}-${Boolean(current.cards)}`
    : "";
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [milestone]);
  const answerLength = current?.answer.length ?? 0;
  useEffect(() => {
    if (answerLength) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [answerLength]);

  // The quest's last button: its answers become this chat's first question
  const reveal = (note) => {
    keepLastAnswers(userId, preferences);
    setLastAnswers(preferences);
    ask(note || "Find my next game", preferences);
  };

  // The background takes its colours from the newest Best Pick
  // The cover wall follows the chat: your picks first (Best Pick leading), then the
  // games it's considering, then featured games to fill the wall
  const [featured, setFeatured] = useState([]);
  useEffect(() => {
    getFeaturedGames()
      .then((games) => setFeatured(games.map((game) => game.coverUrl)))
      .catch(() => {}); // no featured games: the wall just uses the chat's own
  }, []);
  // Worked out again only when the picks, candidates or featured games change (not
  // for every piece of streamed text), so the wall itself doesn't re-render either
  const cardGames = current?.cards?.games;
  const candidates = current?.games;
  const wallCovers = useMemo(() => {
    const picks = [...(cardGames ?? [])].sort((a, b) => b.best_pick - a.best_pick);
    return [
      ...new Set(
        [
          ...picks.map((g) => g.cover),
          ...(candidates ?? []).map((g) => g.cover),
          ...featured,
        ].filter(Boolean),
      ),
    ].slice(0, 42);
  }, [cardGames, candidates, featured]);

  const history = (
    <ChatHistory
      chats={guide.chats}
      activeId={chatId}
      disabled={running}
      onNew={() => {
        newChat();
        setHistoryOpen(false);
      }}
      onOpen={(id) => {
        guide.openChat(id).catch(() => {});
        setHistoryOpen(false);
      }}
      onDelete={guide.deleteChat}
    />
  );

  return (
    // lg+: fits the window under the navbar (75px), each column scrolls on its own.
    // isolate: the backdrop sits behind this page's content, above the app's black
    <div className="isolate max-w-[1600px] mx-auto px-4 md:px-6 py-4 lg:py-5 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[240px_minmax(0,1fr)_400px] gap-6 lg:h-[calc(100dvh-75px)]">
      <PlayNextBackdrop covers={wallCovers} />

      {/* Chat history (wide screens) */}
      <aside className="hidden xl:block min-h-0 overflow-y-auto pr-1">
        {history}
      </aside>

      {/* Chat */}
      {/* No blur on these panels: the cover wall behind them never stops moving, and blur
          over moving content is recomputed every frame (it made the chat feel laggy) */}
      <section className="flex flex-col min-h-[75vh] lg:min-h-0 lg:rounded-3xl lg:border lg:border-white/10 lg:bg-slate-950/75 lg:overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 lg:px-6 lg:pt-5 pb-4 lg:border-b lg:border-white/5">
          <div className="min-w-0">
            <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tight text-white leading-none">
              Play Next<span className="text-brand">.</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Your reviews and the IMGM community, dug through live to find your
              next game.
            </p>
          </div>
          {/* Smaller screens: the chats list opens here */}
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            className="xl:hidden px-4 py-2 rounded-xl text-sm font-bold text-white border border-slate-700 hover:border-slate-500 hover:bg-white/5 transition"
          >
            Your chats {historyOpen ? "▴" : "▾"}
          </button>
        </header>
        {historyOpen && (
          <div className="xl:hidden mb-4 lg:mx-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 animate-fade-in">
            {history}
          </div>
        )}

        {/* The conversation: scrolls inside the panel on large screens */}
        <div className="flex-1 min-h-0 lg:overflow-y-auto lg:px-6 py-5 flex flex-col gap-10">
          {/* A new chat starts with the quest; the chat takes over once it's answered */}
          {turns.length === 0 && (
            <FindMyGame
              key={chatId}
              prefs={prefs}
              onChange={setPrefs}
              onReveal={reveal}
              lastAnswers={lastAnswers}
              disabled={running || full}
            />
          )}

          {turns.map((turn) => (
            <GuideTurn
              key={turn.id}
              turn={turn}
              isLatest={turn === current}
              running={running}
              onNotForMe={onNotForMe}
              onAsk={onAsk}
              onEdit={onEdit}
              onRetry={guide.retryLast}
              canAsk={!running && !full}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* The composer: pinned to the panel's bottom (large screens) or the screen's (small) */}
        {turns.length > 0 && (
          <div className="sticky bottom-4 lg:static rounded-3xl lg:rounded-none bg-slate-950/95 lg:bg-slate-950/80 p-3 lg:px-6 lg:py-4 border border-slate-800 lg:border-0 lg:border-t lg:border-white/5 shadow-2xl shadow-black/50 lg:shadow-none">
            {full && (
              <p className="px-2 pb-3 text-sm text-slate-300">
                This chat is full ({MAX_QUESTIONS} questions).{" "}
                <button
                  type="button"
                  onClick={newChat}
                  className="font-bold text-brand hover:underline"
                >
                  Start a new chat
                </button>{" "}
                to keep going.
              </p>
            )}
            {/* key: another chat remounts it, so "Tune it" shows that chat's state */}
            <GuideComposer
              key={chatId}
              onAsk={onAsk}
              onStop={guide.stop}
              running={running}
              disabled={running || full}
              prefs={prefs}
              onPrefsChange={setPrefs}
            />
          </div>
        )}
      </section>

      {/* Side panel (large screens) */}
      <aside className="hidden lg:block min-h-0 overflow-y-auto pr-1">
        <GuidePanel
          turn={current}
          onNotForMe={onNotForMe}
          disabled={running}
        />
      </aside>
    </div>
  );
}

export default GameGuide;
