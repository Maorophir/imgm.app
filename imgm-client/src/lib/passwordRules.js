/**
 * IMGM's password rules, for the live checklist on sign-up, change password and reset
 * password. The server checks the same rules (imgm-server/src/lib/passwordRules.js) and
 * has the final say; keep the two in step.
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

// The checklist: each rule, and whether the password meets it yet
export const passwordChecklist = (password) => [
  { label: `At least ${MIN_LENGTH} characters`, ok: password.length >= MIN_LENGTH && password.length <= MAX_LENGTH },
  { label: 'An uppercase letter', ok: /[A-Z]/.test(password) },
  { label: 'A lowercase letter', ok: /[a-z]/.test(password) },
  { label: 'A number', ok: /\d/.test(password) },
];
