/**
 * Steam on IMGM, the parts every Steam page shares: sending the player to Steam's own
 * sign-in page, what each answer from it means, and Steam's playtime in hours.
 *
 * Steam sends the player back to IMGM with ?steam=connected, or ?steam_error=<code>
 * (only codes from the list below: a link can't make the page say something else).
 */

// Steam's sign-in page. IMGM's server builds the full address; it's checked here too,
// so the page only ever leaves for Steam itself.
const STEAM_LOGIN = 'https://steamcommunity.com/openid/login?';

export const goToSteam = ({ url } = {}) => {
  if (typeof url !== 'string' || !url.startsWith(STEAM_LOGIN)) throw new Error('Unexpected Steam address');
  window.location.assign(url);
};

// What a ?steam_error=<code> means, in the site's words
export const STEAM_ERRORS = {
  cancelled: "You didn't finish on Steam, so nothing changed.",
  invalid: "Steam couldn't confirm it was you. Please try again.",
  expired: 'That took a little too long. Please try again.',
  taken: "That Steam account is already connected to another IMGM account.",
  already_connected: 'Your IMGM account already has a Steam account connected.',
  session_changed: 'You logged in as someone else in the meantime. Please try again.',
  not_connected: "That Steam account isn't connected to IMGM yet. Log in with email or Google, then connect Steam.",
  failed: "Something went wrong talking to Steam. Please try again in a minute.",
};

export const steamErrorMessage = (code) => (typeof code === 'string' && Object.hasOwn(STEAM_ERRORS, code) ? STEAM_ERRORS[code] : null);

// Starting a connection can be refused before Steam is ever reached: the reason, in
// the site's words (from the server's error code)
export const steamStartError = (error) => {
  const code = error?.data?.code;
  if (code === 'EMAIL_NOT_VERIFIED') return 'Confirm your email first (Settings can send the email again), then connect Steam.';
  if (code === 'SESSION_NOT_FRESH') return 'For your safety, log in again to connect Steam.';
  if (code === 'STEAM_ALREADY_CONNECTED') return STEAM_ERRORS.already_connected;
  if (error?.status === 429) return 'Too many tries. Please wait a minute and try again.';
  return "Couldn't reach Steam right now. Please try again.";
};

// Steam's playtime (minutes) as the hours IMGM records: whole hours, and at least 1 for
// any time played at all (a 20-minute game isn't "0 hours")
export const steamHours = (minutes) => (minutes > 0 ? Math.max(1, Math.round(minutes / 60)) : 0);

// "142 h", "<1 h" for a short session: how the library shows playtime
export const hoursLabel = (minutes) => (minutes <= 0 ? '0 h' : minutes < 60 ? '<1 h' : `${Math.round(minutes / 60).toLocaleString('en-US')} h`);
