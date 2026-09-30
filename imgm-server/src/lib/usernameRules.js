/**
 * Display-name ("gamer tag") rules — one place for every rule a name must pass.
 * Names are unique regardless of capitals: we store a lowercase `username` for
 * uniqueness and the user's own capitalisation as `displayUsername`.
 */
import { hasProfanity } from './moderation.js';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_COOLDOWN_DAYS = 30;

const ALLOWED_CHARACTERS = /^[A-Za-z0-9_-]+$/;

// Names that could pass for IMGM staff or break things
const RESERVED_EXACT = ['mod', 'mods', 'support', 'staff', 'official', 'system', 'root', 'null', 'undefined', 'anonymous', 'deleted', 'everyone', 'help', 'api', 'player'];
const RESERVED_ANYWHERE = ['imgm', 'admin', 'moderator'];

/**
 * Returns null if the name is fine, or a message explaining what to change.
 */
export const checkUsernameRules = (name) => {
  const value = String(name ?? '').trim();
  const lower = value.toLowerCase();

  if (value.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (value.length > USERNAME_MAX) return `Use at most ${USERNAME_MAX} characters.`;
  if (!ALLOWED_CHARACTERS.test(value)) return 'Use only letters, numbers, _ and -.';
  if (RESERVED_EXACT.includes(lower) || RESERVED_ANYWHERE.some((word) => lower.includes(word))) {
    return 'That name is reserved. Please pick another.';
  }
  if (hasProfanity(value, { ignoreSeparators: true })) return 'Please pick a name without offensive words.';
  return null;
};

// Lowercase key used for "is this name taken?"
export const normalizeUsername = (name) => String(name).trim().toLowerCase();

// When a user who last changed their name at `changedAt` may change it again
export const nextChangeAllowedAt = (changedAt) =>
  changedAt ? new Date(new Date(changedAt).getTime() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) : null;
