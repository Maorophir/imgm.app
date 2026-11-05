/**
 * Which days each player used the site logged in (PlayerDay), for the admin stats: how
 * many players are active each week, and how many new ones come back. Nothing about
 * logged-out visitors, and no IPs: just the player and the date (UTC).
 *
 * Written at most once a day per player: the players already counted today are kept in
 * memory, so a page view costs no database write after the day's first. After a restart
 * the first request writes again, and the row already being there is fine.
 */
import { prisma } from './db.js';

let today = null; // 'YYYY-MM-DD'
let counted = new Set(); // player ids counted today

export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

// Fire-and-forget: a failed write never slows or breaks the request it came with
export const recordActivity = (userId) => {
  if (!userId) return;
  const day = utcDay();
  if (day !== today) {
    today = day;
    counted = new Set();
  }
  if (counted.has(userId)) return;
  counted.add(userId);
  prisma.playerDay
    .createMany({ data: [{ userId, day: new Date(`${day}T00:00:00Z`) }], skipDuplicates: true })
    .catch((error) => {
      counted.delete(userId); // try again on their next request
      console.error('Counting a player day failed:', error.message);
    });
};
