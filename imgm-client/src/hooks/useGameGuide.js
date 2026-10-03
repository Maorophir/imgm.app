/**
 * useGameGuide — runs Game Guide requests and turns their live events into state.
 *
 * Each question is a "turn": { question, steps, games, answer, cards, status, error }.
 *   steps  the timeline ("Asking IMGM players…" → "5 games match")
 *   games  every game the agent considered, in the order it found them
 *   answer the guide's text, streamed in token by token
 *   cards  the final 5 picks (with one Best Pick)
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { streamGuide } from '../lib/api';

const STREAM_EVENTS = new Set(['step', 'games', 'token', 'cards', 'done']);

const newTurn = (question) => ({
  id: crypto.randomUUID(),
  question,
  steps: [],
  games: [],
  answer: '',
  answerId: null,
  cards: null,
  status: 'running', // running | done | error
  error: null,
});

// Every change goes to the latest turn
const updateLast = (turns, change) => [...turns.slice(0, -1), change(turns.at(-1))];

function reducer(turns, action) {
  switch (action.type) {
    case 'start':
      return [...turns, newTurn(action.question)];
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
          : { ...turn, status: 'error', error: 'The guide finished without picks. Try asking another way.' }
      );
    case 'error':
      return updateLast(turns, (turn) => ({ ...turn, status: 'error', error: action.message }));
    default:
      return turns;
  }
}

export function useGameGuide() {
  const [turns, dispatch] = useReducer(reducer, []);
  const abortRef = useRef(null);

  // Leaving the page stops the request (and the AI run behind it)
  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(async (question, preferences = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'start', question });
    try {
      await streamGuide(
        { message: question, preferences },
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

  const current = turns.at(-1) ?? null;
  return { turns, current, running: current?.status === 'running', ask };
}
