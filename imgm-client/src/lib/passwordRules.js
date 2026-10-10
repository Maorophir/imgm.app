/**
 * IMGM's password rules, for the live checklist on sign-up, change password and reset
 * password. The server checks the same rules (imgm-server/src/lib/passwordRules.js) and
 * has the final say; keep the two in step.
 *
 *     8 to 128 characters, an uppercase letter, a lowercase letter, a number,
 *     not a common password ("Password1!", "Qwerty123"), not your email's name
 */
export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

// The words behind most leaked passwords: a password that's one of these plus digits or
// symbols ("Welcome2026!") is the first thing an attacker tries
const COMMON = new Set([
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'qwerty', 'qwertyuiop', 'asdf', 'asdfgh', 'zxcvbn',
  'welcome', 'letmein', 'iloveyou', 'admin', 'login', 'abc', 'abcd', 'abcdef', 'monkey', 'dragon',
  'football', 'baseball', 'soccer', 'sunshine', 'princess', 'master', 'shadow', 'superman', 'batman',
  'starwars', 'pokemon', 'minecraft', 'fortnite', 'gamer', 'gaming', 'imgm', 'iamgaming', 'secret',
  'trustno', 'hello', 'freedom', 'whatever', 'changeme', 'test', 'user',
]);
const base = (password) => password.toLowerCase().replace(/[\d\W_]+$/, '').replace(/^[\d\W_]+/, '');
const RUN = 'abcdefghijklmnopqrstuvwxyz0123456789';
// A common word, one letter over and over ("Aaaaaaaa1") or a run ("Abcdefgh1", "12345678")
const isCommon = (password) => {
  const word = base(password) || password.toLowerCase();
  return COMMON.has(word) || /^(.)\1*$/.test(word) || RUN.includes(word) || RUN.includes(password.toLowerCase());
};

// What's wrong with a new password (empty = it's fine)
export const passwordProblems = (password, email = '') => {
  const problems = [];
  if (typeof password !== 'string' || password.length < MIN_LENGTH) problems.push(`Use at least ${MIN_LENGTH} characters.`);
  else if (password.length > MAX_LENGTH) problems.push(`Use at most ${MAX_LENGTH} characters.`);
  if (typeof password !== 'string') return problems;
  if (!/[A-Z]/.test(password)) problems.push('Add an uppercase letter.');
  if (!/[a-z]/.test(password)) problems.push('Add a lowercase letter.');
  if (!/\d/.test(password)) problems.push('Add a number.');
  const name = email.split('@')[0]?.toLowerCase();
  if (isCommon(password)) {
    problems.push('That password is too common. Pick something harder to guess.');
  } else if (name && name.length >= 4 && password.toLowerCase().includes(name)) {
    problems.push("Don't use your email's name in your password.");
  }
  return problems;
};

// The checklist: each rule, and whether the password meets it yet
export const passwordChecklist = (password, email = '') => [
  { label: `${MIN_LENGTH}+ characters`, ok: password.length >= MIN_LENGTH && password.length <= MAX_LENGTH },
  { label: 'Upper and lowercase letters', ok: /[A-Z]/.test(password) && /[a-z]/.test(password) },
  { label: 'A number', ok: /\d/.test(password) },
  { label: 'Hard to guess', ok: password.length > 0 && !passwordProblems(password, email).some((p) => /common|email/.test(p)) },
];
