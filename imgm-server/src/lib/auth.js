import { beforeAccountDeleted, afterAccountDeleted } from './accountCleanup.js';
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { passwordProblems } from "./passwordRules.js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";
import { clientOrigins } from "./config.js";
import { resetPasswordEmail, sendEmail, welcomeEmail, welcomeVerifyEmail } from "./email.js";
import { steam } from "./steamAuth.js";
import { disconnectSteam } from "./steamAccount.js";
import { recordActivity } from "./activity.js";
import { claimUnconfirmedAccount } from "./accountClaim.js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  secret: process.env.BETTER_AUTH_SECRET || "this-is-a-temporary-secret-key-for-local-development-only-12345",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // "Forgot your password?": Better Auth makes the one-hour link, we deliver it.
    // Not awaited, so the reply takes the same time whether or not the email has an
    // account (otherwise the timing would reveal who is registered).
    sendResetPassword: async ({ user, url }) => {
      sendEmail({ to: user.email, ...resetPasswordEmail(url) }).catch((error) =>
        console.error('Password reset email failed:', error.message)
      );
    },
    // A new password logs the account out everywhere else
    revokeSessionsOnPasswordReset: true,
    // ...and disconnects Steam: getting an account back must also shut out a Steam
    // account someone else may have connected to it (they can connect it again)
    onPasswordReset: async ({ user }) => {
      await disconnectSteam(user.id);
    },
  },
  // Every new password must pass IMGM's rules (passwordRules.js): sign-up, change
  // password and "forgot your password?". The website shows them as a checklist; this
  // is the check that counts.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const field = { "/sign-up/email": "password", "/change-password": "newPassword", "/reset-password": "newPassword" }[ctx.path];
      if (!field) return;
      const [problem] = passwordProblems(ctx.body?.[field]);
      if (problem) throw new APIError("BAD_REQUEST", { message: problem, code: "WEAK_PASSWORD" });
    }),
    // The site asks for the session on every page load: that counts the player's day for
    // the admin stats (activity.js), also on pages that call nothing else
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/get-session") recordActivity(ctx.context.returned?.user?.id);
    }),
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder_client_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder_client_secret",
    },
  },
  // A Google login with an IMGM account's email joins that account, even one whose
  // email was never confirmed (Better Auth refuses those by default, so an unconfirmed
  // sign-up with your email would keep you from using Google). Google is not a trusted
  // provider here, so this only happens when Google itself has confirmed the email;
  // accountClaim.js then clears out what the unconfirmed sign-up left behind.
  account: {
    accountLinking: { requireLocalEmailVerified: false },
  },
  trustedOrigins: clientOrigins,
  // Its rate limits count per visitor: the address index.js puts in this header (from
  // clientIp.js). Without it, behind Vercel and Render it saw no single address and kept
  // one bucket for the whole site: 3 logins per 10 seconds for everyone together.
  advanced: {
    ipAddress: { ipAddressHeaders: ['x-imgm-client-ip'] },
  },
  // Connecting a Steam account and logging in with it (/api/auth/steam/*, steamAuth.js)
  plugins: [steam()],
  // Email sign-ups get a welcome email with a "Confirm my email" button (logging in
  // doesn't wait for it; Settings shows the status and can send it again)
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      sendEmail({ to: user.email, ...welcomeVerifyEmail(url) }).catch((error) =>
        console.error('Welcome email failed:', error.message)
      );
    },
  },
  // Google sign-ups arrive already confirmed: they get a plain welcome instead
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!user.emailVerified) return; // email sign-ups: the confirm email is the welcome
          sendEmail({ to: user.email, ...welcomeEmail(clientOrigins[0]) }).catch((error) =>
            console.error('Welcome email failed:', error.message)
          );
        },
      },
    },
    // A Google login joining an unconfirmed account takes it over clean (accountClaim.js)
    account: {
      create: {
        before: async (account) => {
          if (account.providerId === "google") await claimUnconfirmedAccount(account.userId);
        },
      },
    },
  },
  // The gamer tag travels with the session (so the site knows who still needs to
  // pick one). input: false = Better Auth's own update routes can't change these;
  // only our /api/users routes can, and they enforce the name rules + 30-day limit.
  user: {
    // "Delete my account" in the profile's settings: needs the password, or (Google
    // accounts) a login from the last day. The hooks clean up around it.
    deleteUser: {
      enabled: true,
      beforeDelete: beforeAccountDeleted,
      afterDelete: afterAccountDeleted,
    },
    additionalFields: {
      username: { type: "string", required: false, input: false },
      displayUsername: { type: "string", required: false, input: false },
      usernameChangedAt: { type: "date", required: false, input: false },
      avatarUpdatedAt: { type: "date", required: false, input: false }, // set by /api/users/me/avatar
      // 'player' or 'admin' (set by hand in the database). The session carries it so
      // the site can show an admin their menu link; the admin routes read it fresh.
      role: { type: "string", required: false, input: false },
    },
  },
});
