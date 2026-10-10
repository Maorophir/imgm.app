/**
 * Player levels & tiers — what XP means.
 *
 * XP comes from reviews (up to 130 each; the server adds them up). Levels are a
 * slow grind: each level needs 200 XP more than the one before, so
 * Level 2 = 200 XP, Level 3 = 600, Level 5 = 2,000, Level 10 = 9,000.
 * Every few levels the player climbs a critic tier.
 */

// `minLevel` = the first level of the tier. Worst → best.
export const TIERS = [
  { key: 'casual',       label: 'Casual Player', minLevel: 1,  color: '#94a3b8' },
  { key: 'reviewer',     label: 'Reviewer',      minLevel: 3,  color: '#2dd4bf' },
  { key: 'critic',       label: 'Critic',        minLevel: 6,  color: '#38bdf8' },
  { key: 'top_critic',   label: 'Top Critic',    minLevel: 10, color: '#e879f9' },
  { key: 'hall_of_fame', label: 'Hall of Fame',  minLevel: 15, color: '#fbbf24' },
];

// Total XP needed to reach a level: 0, 200, 600, 1200, 2000, …
export const xpForLevel = (level) => 100 * level * (level - 1);

export const getLevel = (xp) => {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
};

export const getTier = (level) => TIERS.findLast((t) => level >= t.minLevel);

// "Lv 3–5" for a tier, "Lv 15+" for the last one
export const tierLevels = (tier) => {
  const next = TIERS[TIERS.indexOf(tier) + 1];
  if (!next) return `Lv ${tier.minLevel}+`;
  const last = next.minLevel - 1;
  return last === tier.minLevel ? `Lv ${last}` : `Lv ${tier.minLevel}–${last}`;
};

/**
 * Everything the UI needs about a player's XP: level, tier, and how far
 * they are through the current level (`pct`, 0–100).
 */
export const getProgress = (xp = 0) => {
  const level = getLevel(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    xp,
    level,
    tier: getTier(level),
    toNext: next - xp,
    pct: Math.round(((xp - start) / (next - start)) * 100),
  };
};
