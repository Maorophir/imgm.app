/**
 * Email — sends transactional emails (password reset) through Resend's HTTP API.
 *
 * An HTTP API rather than SMTP on purpose: Render's free services can't send on the
 * SMTP ports (25, 465, 587). Without RESEND_API_KEY (local development) nothing is
 * sent: the email is printed to the server log instead, link included.
 */

const RESEND_URL = 'https://api.resend.com/emails';
const FROM = (process.env.EMAIL_FROM || 'IMGM <no-reply@imgm.app>').trim(); // a stray space after = must not break it

export const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] Not sent (no RESEND_API_KEY). To: ${to} · ${subject}\n${text}`);
    return;
  }
  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (!response.ok) {
    throw new Error(`Email to ${to} failed: ${response.status} ${await response.text()}`);
  }
};

const LIME = '#c6eb4e'; // the site's lime (--color-brand)
// The power switch as a picture (mail apps don't show SVG), always from the live site:
// a mail app loads it from the internet, so a test email from a laptop can't use localhost
const LOGO = 'https://imgm.app/email-start.png';

// Every email's top: the logo (power switch + IMGM) and what the letters stand for, and
// a lime line across the card's top
const HEADER = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px"><tr>
      <td style="vertical-align:middle;padding-right:12px"><img src="${LOGO}" width="32" height="32" alt="" style="display:block;border:0"></td>
      <td style="vertical-align:middle">
        <span style="display:block;font-size:24px;line-height:1;font-weight:900;letter-spacing:3px;color:#ffffff">IMGM</span>
        <span style="display:block;margin-top:5px;font-size:11px;line-height:1;font-weight:700;letter-spacing:3px;color:${LIME}">I AM GAMING</span>
      </td>
    </tr></table>`;
const CARD = `max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-top:3px solid ${LIME};border-radius:16px;padding:32px`;

/**
 * The "reset your password" email: IMGM's look (black, white text, a lime button),
 * a friendly gamer tone, and a clear "didn't ask for this? do nothing" so nobody
 * clicks it by mistake. Plus a plain-text version for mail apps without HTML.
 */
export const resetPasswordEmail = (url) => ({
  subject: 'Your IMGM password reset link',
  text: [
    'Respawning your password',
    '',
    'We got a request to reset the password for your IMGM account.',
    'If that was you, choose a new password here. The link works for 1 hour:',
    url,
    '',
    "Didn't ask for this? No action needed. Your password stays the same, and nobody can change it without this link.",
    '',
    'See you in the reviews,',
    'IMGM',
  ].join('\n'),
  html: `
<div style="background:#0a0a0a;padding:40px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="${CARD}">
    ${HEADER}
    <h1 style="margin:0 0 12px;font-size:22px;color:#ffffff">Respawning your password</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#d4d4d4">We got a request to reset the password for your IMGM account. If that was you, hit the button and pick a new one. The link works for 1 hour, then it times out.</p>
    <a href="${url}" style="display:inline-block;background:${LIME};color:#0a0a0a;font-weight:700;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:10px">Choose a new password</a>
    <div style="margin:28px 0 0;padding:16px;border-radius:10px;background:#1c1c1c;border:1px solid #262626">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#d4d4d4"><strong style="color:#ffffff">Didn't ask for this?</strong> No action needed. Your password stays the same, and nobody can change it without this link.</p>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#737373">See you in the reviews,<br>IMGM</p>
  </div>
</div>`,
});

// The welcome emails' button: IMGM's power switch (the logo, as a picture the site hosts:
// mail apps don't show SVG) over the word START, for "Press start." The word is text, so
// the button still reads and works when a mail app hides pictures.
const startButton = (url) => `
    <div style="text-align:center">
      <a href="${url}" style="display:inline-block;text-decoration:none;padding:16px 32px;border:2px solid ${LIME};border-radius:12px">
        <img src="${LOGO}" width="56" height="56" alt="" style="display:block;margin:0 auto;border:0">
        <span style="display:block;margin-top:10px;font-size:15px;font-weight:700;letter-spacing:4px;color:${LIME}">START</span>
      </a>
    </div>`;

// The frame every IMGM email shares: black card, white text, a lime button (or, with
// button.start, the START button)
const emailFrame = (title, intro, button, note) => `
<div style="background:#0a0a0a;padding:40px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="${CARD}">
    ${HEADER}
    <h1 style="margin:0 0 12px;font-size:22px;color:#ffffff">${title}</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#d4d4d4">${intro}</p>
    ${button.start ? startButton(button.url) : `<a href="${button.url}" style="display:inline-block;background:${LIME};color:#0a0a0a;font-weight:700;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:10px">${button.label}</a>`}
    ${note ? `<div style="margin:28px 0 0;padding:16px;border-radius:10px;background:#1c1c1c;border:1px solid #262626"><p style="margin:0;font-size:14px;line-height:1.6;color:#d4d4d4">${note}</p></div>` : ''}
    <p style="margin:24px 0 0;font-size:13px;color:#737373">See you in the reviews,<br>IMGM</p>
  </div>
</div>`;

const WHAT_TO_DO =
  'Review the games you play as quick quests (and earn XP and badges), let Play Next pick your next 5 games, and vote for the Game of the Week.';

/** After an email sign-up (and when asked again): welcome, and please confirm your email. */
export const welcomeVerifyEmail = (url) => ({
  subject: 'Welcome to IMGM: confirm your email',
  text: [
    'Welcome to IMGM. Press start.',
    '',
    WHAT_TO_DO,
    '',
    'One quick thing: press start to confirm this is your email address:',
    url,
    '',
    "Didn't sign up? Just ignore this email.",
    '',
    'See you in the reviews,',
    'IMGM',
  ].join('\n'),
  html: emailFrame(
    `Welcome to IMGM. <span style="color:${LIME}">Press start.</span>`,
    `${WHAT_TO_DO}<br><br>One quick thing: press start to confirm this is your email address.`,
    { url, start: true },
    "<strong style=\"color:#ffffff\">Didn't sign up?</strong> Just ignore this email: nothing happens without this link."
  ),
});

/** After a Google sign-up (Google already confirmed the email): just a welcome. */
export const welcomeEmail = (siteUrl) => ({
  subject: 'Welcome to IMGM!',
  text: ['Welcome to IMGM. Press start.', '', WHAT_TO_DO, '', `Press start: ${siteUrl}`, '', 'See you in the reviews,', 'IMGM'].join('\n'),
  html: emailFrame(`Welcome to IMGM. <span style="color:${LIME}">Press start.</span>`, WHAT_TO_DO, { url: siteUrl, start: true }),
});

/**
 * After a Steam account is connected (lib/steamAuth.js): a heads-up, because whoever can
 * log in to that Steam account can now log in to this IMGM account too. If it wasn't
 * them, resetting the password gets the account back and disconnects Steam with it.
 */
export const steamConnectedEmail = (settingsUrl) => ({
  subject: 'Steam is now connected to your IMGM account',
  text: [
    'Steam is connected',
    '',
    'A Steam account was just connected to your IMGM account. You can now log in with Steam, and rate games straight from your Steam library.',
    '',
    `To disconnect it, open Settings: ${settingsUrl}`,
    '',
    "Wasn't you? Reset your password from the login page: that also disconnects Steam.",
    '',
    'See you in the reviews,',
    'IMGM',
  ].join('\n'),
  html: emailFrame(
    'Steam is connected',
    'A Steam account was just connected to your IMGM account. You can now log in with Steam, and rate games straight from your Steam library.',
    { url: settingsUrl, label: 'Open Settings' },
    "<strong style=\"color:#ffffff\">Wasn't you?</strong> Reset your password from the login page: that also disconnects Steam."
  ),
});
