/**
 * The feed's words for time, shared by Discover and the home page's Discover phone (so
 * the two always say it the same way).
 */
const DAY = 24 * 60 * 60 * 1000;

// 75 seconds as "1:15"
export const clock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// When it's out, in words. IGDB marks a game known only by its year as out on 31 December.
export const releaseLine = (date, now) => {
  if (!date) return null;
  const when = new Date(date);
  const days = Math.ceil((when.getTime() - now) / DAY);
  if (days > 0) {
    if (when.getUTCMonth() === 11 && when.getUTCDate() === 31) return `Coming ${when.getUTCFullYear()}`;
    if (days === 1) return 'Out tomorrow';
    if (days <= 60) return `Out in ${days} days`;
    return `Out ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
  }
  return when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
