/**
 * The one message "Sort your picks" sends when you press Done: which picks you already
 * played (and whether you liked them), which aren't for you, and which to keep. The
 * agent's follow-up rules then keep those in place and replace only the others.
 */

// "A, B and C"
const listOf = (titles) =>
  titles.length < 2 ? titles.join('') : `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)}`;

// The one message Done sends (null when every card is kept: nothing to replace)
export const sortMessage = (picks, choices, liked) => {
  const played = picks.filter((p) => choices[p.game_id] === 'played');
  const rejected = picks.filter((p) => choices[p.game_id] === 'no');
  if (played.length + rejected.length === 0) return null;
  const kept = picks.filter((p) => !['played', 'no'].includes(choices[p.game_id]));
  const feeling = (p) => (liked[p.game_id] === true ? ' (loved it)' : liked[p.game_id] === false ? " (didn't enjoy it)" : '');
  const replaced = played.length + rejected.length;
  return [
    played.length > 0 && `I already played ${listOf(played.map((p) => p.title + feeling(p)))}.`,
    rejected.length > 0 && `${listOf(rejected.map((p) => p.title))} ${rejected.length === 1 ? "isn't" : "aren't"} for me.`,
    kept.length > 0
      ? `Keep ${listOf(kept.map((p) => p.title))}, and replace the other ${replaced}.`
      : 'Replace all of them.',
  ].filter(Boolean).join(' ');
};
