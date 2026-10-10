/**
 * IMGM's password rules, checked on every new password: sign-up, change password and
 * "forgot your password?" (the auth hook in auth.js). The website shows the same rules
 * as a live checklist (imgm-client/src/lib/passwordRules.js); keep the two in step.
 *
 *     8 to 128 characters, an uppercase letter, a lowercase letter, a number
 */
export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

// What's wrong with a new password (empty = it's fine)
export const passwordProblems = (password) => {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) return [`Use at least ${MIN_LENGTH} characters.`];
  const problems = [];
  if (password.length > MAX_LENGTH) problems.push(`Use at most ${MAX_LENGTH} characters.`);
  if (!/[A-Z]/.test(password)) problems.push('Add an uppercase letter (A-Z).');
  if (!/[a-z]/.test(password)) problems.push('Add a lowercase letter (a-z).');
  if (!/\d/.test(password)) problems.push('Add a number (0-9).');
  return problems;
};
