// The brief's groups with their games filled in. Each game is a pick (with its rank,
// Best Pick first, as in the panel) or a mention (an extra that has no card). Groups
// left with no game we can show are dropped.
export const briefGroups = (cards) => {
  const ranked = [...cards.games].sort((a, b) => b.best_pick - a.best_pick);
  const picks = new Map(ranked.map((g, i) => [g.game_id, { ...g, kind: 'pick', rank: i + 1 }]));
  const mentions = new Map((cards.mentions ?? []).map((m) => [m.game_id, { ...m, kind: 'mention' }]));
  return (cards.brief ?? [])
    .map((group) => ({
      heading: group.heading,
      games: group.game_ids.map((id) => picks.get(id) ?? mentions.get(id)).filter(Boolean),
    }))
    .filter((group) => group.games.length > 0);
};
