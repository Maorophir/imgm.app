/**
 * useGameGuide — runs Play Next requests and turns their live events into state.
 *
 * A conversation has one chatId (a random id made here). Every question in it sends
 * the same id, so the AI remembers what was said: follow-ups and "Not for me" work.
 * newChat() starts over with a fresh id.
 *
 * The chat is kept in this browser tab (sessionStorage, per player), so opening a
 * picked game and coming back finds it where you left it. The AI remembers it too
 * (by the same chatId), so follow-ups keep working. Closing the tab forgets it.
 *
 * Each question is a "turn": { question, steps, games, answer, cards, status, error }.
 *   steps  the timeline ("Asking IMGM players…" → "5 games match")
 *   games  every game the agent considered, in the order it found them
 *   answer the guide's text, streamed in token by token
 *   cards  the final 5 picks (with one Best Pick)
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { streamGuide } from '../lib/api';

const STREAM_EVENTS = new Set(['step', 'games', 'token', 'cards', 'done']);

const newTurn = (question, kind) => ({
  id: crypto.randomUUID(),
  question,
  kind, // "ask" or "not_for_me"
  steps: [],
  games: [],
  answer: '',
  answerId: null,
  cards: null,
  status: 'running', // running | done | error
  error: null,
});

// The tab's saved chat for this player: { chatId, turns }
const storageKey = (userId) => `imgm:play-next:${userId}`;

function loadChat(userId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(userId)));
    if (saved?.chatId && Array.isArray(saved.turns)) {
      // A turn still running when the page was left was stopped with it
      const turns = saved.turns.map((turn) =>
        turn.status === 'running'
          ? { ...turn, status: 'error', error: 'Stopped when you left the page. Ask again to pick it back up.' }
          : turn
      );
      return { chatId: saved.chatId, turns };
    }
  } catch {
    // No storage (private window) or an unreadable entry: start fresh
  }
  return { chatId: crypto.randomUUID(), turns: [] };
}

function saveChat(userId, chat) {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(chat));
  } catch {
    // Storage full or blocked: the chat just won't survive leaving the page
  }
}

// Every change goes to the latest turn
const updateLast = (turns, change) => [...turns.slice(0, -1), change(turns.at(-1))];

function reducer(turns, action) {
  switch (action.type) {
    case 'start':
      return [...turns, newTurn(action.question, action.kind)];
    case 'reset':
      return [];
    case 'step':
      return updateLast(turns, (turn) => {
        const exists = turn.steps.some((s) => s.id === action.data.id);
        const steps = exists
          ? turn.steps.map((s) => (s.id === action.data.id ? { ...s, ...action.data } : s))
          : [...turn.steps, action.data];
        return { ...turn, steps };
      });
    case 'games':
      return updateLast(turns, (turn) => {
        const games = [...turn.games];
        for (const tile of action.data.games) {
          const at = games.findIndex((g) => g.id === tile.id);
          // A game found through reviews and then checked in the catalog keeps both
          if (at === -1) games.push({ ...tile, verified: tile.source === 'catalog' });
          else games[at] = { ...games[at], ...tile, verified: games[at].verified || tile.source === 'catalog' };
        }
        return { ...turn, games };
      });
    case 'token':
      return updateLast(turns, (turn) =>
        // A new message (e.g. the guide rewrote its answer after a check) replaces the old text
        action.data.message_id === turn.answerId
          ? { ...turn, answer: turn.answer + action.data.text }
          : { ...turn, answer: action.data.text, answerId: action.data.message_id }
      );
    case 'cards':
      return updateLast(turns, (turn) => ({ ...turn, cards: action.data }));
    case 'done':
      return updateLast(turns, (turn) =>
        turn.cards
          ? { ...turn, status: 'done' }
          : { ...turn, status: 'error', error: 'No picks this time. Try asking another way.' }
      );
    case 'error':
      return updateLast(turns, (turn) => ({ ...turn, status: 'error', error: action.message }));
    default:
      return turns;
  }
}

export function useGameGuide(userId) {
  const [saved] = useState(() => loadChat(userId)); // read once, when the page opens
  const [turns, dispatch] = useReducer(reducer, saved.turns);
  const abortRef = useRef(null);
  const chatIdRef = useRef(saved.chatId);

  // Every change is saved, so the chat is still here after visiting a game
  useEffect(() => {
    saveChat(userId, { chatId: chatIdRef.current, turns });
  }, [userId, turns]);

  // Leaving the page stops the request (and the AI run behind it)
  useEffect(() => () => abortRef.current?.abort(), []);

  // Sends one turn of this chat and feeds its live events into the turns list
  const run = useCallback(async (label, kind, body) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'start', question: label, kind });
    try {
      await streamGuide(
        { chat_id: chatIdRef.current, ...body },
        {
          signal: controller.signal,
          onEvent: (event, data) => {
            if (event === 'error') dispatch({ type: 'error', message: data.message });
            // Only the events the page shows ("start" is just the server saying hello)
            else if (STREAM_EVENTS.has(event)) dispatch({ type: event, data });
          },
        }
      );
    } catch (error) {
      if (!controller.signal.aborted) dispatch({ type: 'error', message: error.message });
    }
  }, []);

  // A question (the first one, or a follow-up like "shorter ones please")
  const ask = useCallback(
    (question, preferences = {}) => run(question, 'ask', { message: question, preferences }),
    [run]
  );

  // "Not for me" on one card: the AI remembers it for the rest of the chat and swaps it
  const notForMe = useCallback(
    (pick, preferences = {}) =>
      run(`Not for me: ${pick.title}`, 'not_for_me', {
        not_for_me: { game_id: pick.game_id, title: pick.title },
        preferences,
      }),
    [run]
  );

  // A fresh conversation: new chat id, empty page
  const newChat = useCallback(() => {
    abortRef.current?.abort();
    chatIdRef.current = crypto.randomUUID();
    dispatch({ type: 'reset' });
  }, []);

  const current = turns.at(-1) ?? null;
  return { turns, current, running: current?.status === 'running', ask, notForMe, newChat };
}
