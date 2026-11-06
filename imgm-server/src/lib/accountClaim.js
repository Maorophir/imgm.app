import { prisma } from './db.js';
import { disconnectSteam } from './steamAccount.js';

/**
 * A Google login just proved who owns an email, and an IMGM account with that email
 * was signed up with a password but never confirmed. Whoever signed it up may not own
 * the email (someone can sign up with another person's address first, to get in once
 * the real owner starts using it), so the account goes to the Google login clean:
 * the password, every open session and a connected Steam account go, like a password
 * reset. Reviews and the rest stay. The owner can set a password again with
 * "Forgot your password?".
 *
 * Runs before Better Auth links the Google login, so the login's own session (made
 * after) is kept. A confirmed account is left as it is: its owner already proved the
 * email. A brand-new Google sign-up isn't found here (its user isn't saved yet).
 */
export const claimUnconfirmedAccount = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user || user.emailVerified) return;
  await prisma.$transaction([
    prisma.account.deleteMany({ where: { userId, providerId: 'credential' } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  await disconnectSteam(userId);
  console.log(`Google login claimed unconfirmed account ${userId}: password, sessions and Steam removed`);
};
