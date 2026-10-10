import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";
import { clientOrigins } from "./config.js";
import { resetPasswordEmail, sendEmail } from "./email.js";

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
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder_client_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder_client_secret",
    },
  },
  trustedOrigins: clientOrigins,
  // The gamer tag travels with the session (so the site knows who still needs to
  // pick one). input: false = Better Auth's own update routes can't change these;
  // only our /api/users routes can, and they enforce the name rules + 30-day limit.
  user: {
    additionalFields: {
      username: { type: "string", required: false, input: false },
      displayUsername: { type: "string", required: false, input: false },
      usernameChangedAt: { type: "date", required: false, input: false },
      avatarUpdatedAt: { type: "date", required: false, input: false }, // set by /api/users/me/avatar
    },
  },
});
