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
  <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:16px;padding:32px">
    <p style="margin:0 0 24px;font-size:22px;font-weight:900;letter-spacing:4px;color:#ffffff">IMGM<span style="color:#b8f03a">.</span></p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#ffffff">Respawning your password</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#d4d4d4">We got a request to reset the password for your IMGM account. If that was you, hit the button and pick a new one. The link works for 1 hour, then it times out.</p>
    <a href="${url}" style="display:inline-block;background:#b8f03a;color:#0a0a0a;font-weight:700;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:10px">Choose a new password</a>
    <div style="margin:28px 0 0;padding:16px;border-radius:10px;background:#1c1c1c;border:1px solid #262626">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#d4d4d4"><strong style="color:#ffffff">Didn't ask for this?</strong> No action needed. Your password stays the same, and nobody can change it without this link.</p>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#737373">See you in the reviews,<br>IMGM</p>
  </div>
</div>`,
});
