/**
 * useGameGuide — runs Play Next requests and turns their live events into state.
 *
 * A chat is { chatId, turns, prefs }: a random id made here, its questions and
 * answers, and its own "Tune it" answers. Every question sends the same id, so the
 * AI remembers what was said: follow-ups and "Not for me" work.
 *   newChat()    a fresh id, no turns, no tuning
 *   openChat(id) a past chat from the history, with the tuning it had
 *   stop()       stops the answer in progress (the Stop button)
 *   editLast(q)  replaces the latest question with an edited one, and asks it again
 *   retryLast()  asks the latest question again, exactly as it was sent (the redo button)
 * If Play Next goes quiet for 2 minutes (no event at all), the request is stopped
 * and the turn says so: a chat never spins forever.
 *
 * Where it's kept:
 *   this browser tab (sessionStorage): the open chat, so visiting a picked game and
 *     coming back finds it exactly where you left it, even mid-answer
 *   the server (chat history): every chat after each answer, to reopen any time
 *     (20 per player, 10 questions each, 30 days)
 *
 * Each question is a "turn": { question, steps, games, answer, cards, status, error }.
 *   steps  the timeline ("Asking IMGM players…" → "5 games match")
 *   games  every game the agent considered, in the order it found them
 *   answer the guide's text, streamed in token by token
 *   cards  the final 5 picks (with one Best Pick)
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  deleteGuideChat,
  getGuideChat,
  listGuideChats,
  saveGuideChat,
  streamGuide,
} from "../lib/api";

const STREAM_EVENTS = new Set(["step", "games", "token", "cards", "done"]);

const newTurn = (question, kind, request) => ({
  id: crypto.randomUUID(),
  question,
  kind, // "ask" or "not_for_me"
  request, // what was sent (message or not_for_me, preferences): the redo sends it again
  steps: [],
  games: [],
  answer: "",
  answerId: null,
  cards: null,
  status: "running", // running | done | error
  error: null,
});

export const MAX_QUESTIONS = 10; // per chat; the AI service refuses more (server.py)
const SILENCE_LIMIT_MS = 120_000; // no event for this long = Play Next is stuck

// The tab's saved chat for this player: { chatId, turns, prefs }
const storageKey = (userId) => `imgm:play-next:${userId}`;

function loadChat(userId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(userId)));
    if (saved?.chatId && Array.isArray(saved.turns)) {
      // A turn still running when the page was left was stopped with it
      const turns = saved.turns.map((turn) =>
        turn.status === "running"
          ? {
              ...turn,
              status: "error",
              error:
                "Stopped when you left the page. Ask again to pick it back up.",
            }
          : turn,
      );
      return { chatId: saved.chatId, turns, prefs: saved.prefs ?? {} };
    }
  } catch {
    // No storage (private window) or an unreadable entry: start fresh
  }
  return { chatId: crypto.randomUUID(), turns: [], prefs: {} };
}

function keepInTab(userId, chat) {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(chat));
  } catch {
    // Storage full or blocked: the chat just won't survive leaving the page
  }
}

// Every change goes to the latest turn
const updateLast = (turns, change) => [
  ...turns.slice(0, -1),
  change(turns.at(-1)),
];

function reducer(turns, action) {
  switch (action.type) {
    case "start":
      return [...turns, newTurn(action.question, action.kind, action.request)];
    case "reset":
      return [];
    case "drop-last":
      return turns.slice(0, -1);
    case "stopped":
      return turns.at(-1)?.status === "running"
        ? updateLast(turns, (turn) => ({
            ...turn,
            status: "error",
            stopped: true,
            error: "You stopped this answer.",
          }))
        : turns;
    case "load":
      return action.turns;
    case "step":
      return updateLast(turns, (turn) => {
        const exists = turn.steps.some((s) => s.id === action.data.id);
        const steps = exists
          ? turn.steps.map((s) =>
              s.id === action.data.id ? { ...s, ...action.data } : s,
            )
          : [...turn.steps, action.data];
        return { ...turn, steps };
      });
    case "games":
      return updateLast(turns, (turn) => {
        const games = [...turn.games];
        for (const tile of action.data.games) {
          const at = games.findIndex((g) => g.id === tile.id);
          // A game found through reviews and then checked in the catalog keeps both
          if (at === -1)
            games.push({ ...tile, verified: tile.source === "catalog" });
          else
            games[at] = {
              ...games[at],
              ...tile,
              verified: games[at].verified || tile.source === "catalog",
            };
        }
        return { ...turn, games };
      });
    case "token":
      return updateLast(turns, (turn) =>
        // A new message (e.g. the guide rewrote its answer after a check) replaces the old text
        action.data.message_id === turn.answerId
          ? { ...turn, answer: turn.answer + action.data.text }
          : {
              ...turn,
              answer: action.data.text,
              answerId: action.data.message_id,
            },
      );
    case "cards":
      return updateLast(turns, (turn) => ({ ...turn, cards: action.data }));
    case "done":
      return updateLast(turns, (turn) =>
        turn.cards
          ? { ...turn, status: "done" }
          : {
              ...turn,
              status: "error",
              error: "No picks this time. Try asking another way.",
            },
      );
    case "error":
      return updateLast(turns, (turn) => ({
        ...turn,
        status: "error",
        error: action.message,
      }));
    case "ended":
      // The stream closed without "done" or "error" (the connection dropped): never spin forever
      return turns.at(-1)?.status === "running"
        ? updateLast(turns, (turn) => ({
            ...turn,
            status: "error",
            error: "Play Next stopped unexpectedly. Please try again.",
          }))
        : turns;
    default:
      return turns;
  }
}

// What the history keeps of a turn: the panel only shows the latest turn's games
// when it has no cards, so finished turns drop them (keeps saved chats small)
const forHistory = (turns) =>
  turns.map((turn) => (turn.cards ? { ...turn, games: [] } : turn));

export function useGameGuide(userId) {
  const [saved] = useState(() => loadChat(userId)); // read once, when the page opens
  const [turns, dispatch] = useReducer(reducer, saved.turns);
  const [prefs, setPrefs] = useState(saved.prefs);
  const [chatId, setChatId] = useState(saved.chatId);
  const [chats, setChats] = useState([]); // the history: [{ id, title, updatedAt }]
  const abortRef = useRef(null);
  const chatIdRef = useRef(saved.chatId); // the id a running request belongs to
  const finishedRef = useRef(false); // an answer just finished: save the chat

  const refreshChats = useCallback(() => {
    listGuideChats()
      .then((data) => setChats(data.chats))
      .catch(() => {}); // the history is a convenience: the chat works without it
  }, []);
  useEffect(refreshChats, [refreshChats]);

  // Every change is kept in the tab, so the chat is still here after visiting a game
  useEffect(() => {
    keepInTab(userId, { chatId, turns, prefs });
  }, [userId, chatId, turns, prefs]);

  // After each answer, the chat goes to the history
  useEffect(() => {
    if (
      !finishedRef.current ||
      turns.length === 0 ||
      turns.at(-1).status === "running"
    )
      return;
    finishedRef.current = false;
    saveGuideChat(chatId, { turns: forHistory(turns), prefs })
      .then(refreshChats)
      .catch(() => {});
  }, [turns, chatId, prefs, refreshChats]);

  // Leaving the page stops the request (and the AI run behind it)
  useEffect(() => () => abortRef.current?.abort(), []);

  // Sends one turn of this chat and feeds its live events into the turns list
  const run = useCallback(async (label, kind, body) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "start", question: label, kind, request: body });

    // The watchdog: every event resets the clock; a long silence stops the request
    let lastEvent = Date.now();
    const watchdog = setInterval(() => {
      if (Date.now() - lastEvent < SILENCE_LIMIT_MS) return;
      clearInterval(watchdog);
      controller.abort();
      dispatch({
        type: "error",
        message: "Play Next stopped responding. Please try again.",
      });
      finishedRef.current = true;
    }, 5000);

    // The answer's text, streamed in pieces of a few words: drawing each piece re-renders
    // the chat, dozens of times a second. Pieces wait here and are drawn together once
    // per screen refresh (requestAnimationFrame), which looks the same and costs far less.
    let pending = null;
    let frame = 0;
    const flush = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (pending) dispatch({ type: "token", data: pending });
      pending = null;
    };

    try {
      await streamGuide(
        { chat_id: chatIdRef.current, ...body },
        {
          signal: controller.signal,
          onEvent: (event, data) => {
            lastEvent = Date.now();
            // Text arrives in many small pieces: collect them and draw once per frame
            if (event === "token") {
              if (pending && pending.message_id !== data.message_id) flush();
              pending = pending
                ? { ...pending, text: pending.text + data.text }
                : { ...data };
              frame ||= requestAnimationFrame(flush);
              return;
            }
            flush(); // any text still waiting goes before the next event
            if (event === "error")
              dispatch({ type: "error", message: data.message });
            // Only the events the page shows ("start" is just the server saying hello)
            else if (STREAM_EVENTS.has(event)) dispatch({ type: event, data });
          },
        },
      );
      flush();
      if (!controller.signal.aborted) dispatch({ type: "ended" });
    } catch (error) {
      if (!controller.signal.aborted)
        dispatch({
          type: "error",
          // The browser's own words for a dropped connection ("network error",
          // "Failed to fetch"…) mean nothing to a player
          message:
            error instanceof TypeError
              ? "Lost the connection to Play Next. Please try again."
              : error.message,
        });
    }
    clearInterval(watchdog);
    if (!controller.signal.aborted) finishedRef.current = true;
  }, []);

  // A question (the first one, or a follow-up like "shorter ones please")
  const ask = useCallback(
    (question, preferences = {}) =>
      run(question, "ask", { message: question, preferences }),
    [run],
  );

  // "Not for me" or "Played it" on one card: the AI remembers it for the rest of the
  // chat and swaps just that game
  const notForMe = useCallback(
    (pick, preferences = {}, reason = "not_for_me") =>
      run(
        reason === "played" ? `I already played ${pick.title}` : `Not for me: ${pick.title}`,
        "not_for_me",
        {
          not_for_me: { game_id: pick.game_id, title: pick.title, reason },
          preferences,
        },
      ),
    [run],
  );

  // The Stop button: the request is cancelled (Express and the AI service stop too)
  const stop = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "stopped" });
    finishedRef.current = true; // the chat is saved as it stands
  }, []);

  // An edited latest question: it takes the old one's place, here and in the AI's memory
  const editLast = useCallback(
    (question, preferences = {}) => {
      const replaceTurn = turns.length; // the AI branches off from just before it
      dispatch({ type: "drop-last" });
      return run(question, "ask", {
        message: question,
        preferences,
        replace_turn: replaceTurn,
      });
    },
    [run, turns.length],
  );

  // The redo button: the latest question again, replacing the stopped (or failed) one.
  // Reads the turns from a ref, so the button keeps one identity while text streams in
  // (the chat's turns can then skip re-rendering).
  const turnsRef = useRef(turns);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);
  const retryLast = useCallback(() => {
    const turns = turnsRef.current;
    const last = turns.at(-1);
    if (!last) return;
    const request = last.request ?? { message: last.question }; // chats saved before redo existed
    dispatch({ type: "drop-last" });
    return run(last.question, last.kind ?? "ask", {
      ...request,
      replace_turn: turns.length,
    });
  }, [run]);

  // Switches the page to another chat (stopping any answer in progress)
  const show = useCallback((id, chatTurns, chatPrefs) => {
    abortRef.current?.abort();
    chatIdRef.current = id;
    setChatId(id);
    dispatch({ type: "load", turns: chatTurns });
    setPrefs(chatPrefs);
  }, []);

  // A fresh conversation: new chat id, empty page, no tuning
  const newChat = useCallback(() => show(crypto.randomUUID(), [], {}), [show]);

  // A chat from the history, with the tuning it had
  const openChat = useCallback(
    async (id) => {
      const chat = await getGuideChat(id);
      show(chat.id, chat.turns, chat.prefs ?? {});
    },
    [show],
  );

  const deleteChat = useCallback(
    async (id) => {
      await deleteGuideChat(id).catch(() => {});
      if (id === chatIdRef.current) newChat();
      refreshChats();
    },
    [newChat, refreshChats],
  );

  const current = turns.at(-1) ?? null;
  return {
    chatId,
    turns,
    current,
    running: current?.status === "running",
    full: turns.length >= MAX_QUESTIONS,
    prefs,
    setPrefs,
    chats,
    ask,
    notForMe,
    stop,
    editLast,
    retryLast,
    newChat,
    openChat,
    deleteChat,
  };
}
