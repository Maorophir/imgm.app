/**
 * A player's connected Steam account, as IMGM keeps it: one Better Auth login row
 * (Account, providerId 'steam', accountId = the SteamID64) plus the library they
 * imported (SteamLibrary, SteamLibraryGame). Shared by the Steam login plugin
 * (lib/steamAuth.js) and the library routes (routes/steam.js).
 *
 * A SteamID64 is wider than a JavaScript number can hold exactly (7656119…, 17 digits),
 * so it stays a string everywhere: never Number() it.
 */
import { prisma } from './db.js';

export const STEAM_PROVIDER = 'steam';
// Who vouches for a Steam login: kept on its Account row, where the database's unique
// issuer + account id means one Steam account can only be on one IMGM account. Never
// change it. Better Auth 1.7.18 finds logins by provider + account id instead, and its
// createAccount no longer saves the issuer (Steam links made after the 2026-11-06
// upgrade had none, and the site couldn't see them), so stampSteamIssuer adds it.
export const STEAM_ISSUER = 'https://steamcommunity.com/openid';

// The player's public Steam profile page
export const steamProfileUrl = (steamId) => `https://steamcommunity.com/profiles/${steamId}`;

// The SteamID64 of the player's connected Steam account, or null. By provider alone: a
// row saved without its issuer (see STEAM_ISSUER) is still the player's Steam.
export const findSteamId = async (userId) => {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: STEAM_PROVIDER },
    select: { accountId: true },
  });
  return account?.accountId ?? null;
};

// Gives a just-made Steam login row its issuer (Better Auth's createAccount leaves it
// out). Throws if another IMGM account already has this Steam account (the unique
// issuer + account id), so the caller can undo the new row.
export const stampSteamIssuer = (userId, steamId) =>
  prisma.account.updateMany({
    where: { userId, providerId: STEAM_PROVIDER, accountId: steamId, issuer: null },
    data: { issuer: STEAM_ISSUER },
  });

/**
 * Disconnects Steam: the login row and everything imported from Steam, at once.
 * Reviews and the Backlog stay (they're the player's own). Used by "Disconnect Steam"
 * and by a password reset (getting an account back must also shut out a Steam account
 * someone else may have connected to it).
 */
export const disconnectSteam = (userId) =>
  prisma.$transaction([
    prisma.account.deleteMany({ where: { userId, providerId: STEAM_PROVIDER } }),
    prisma.steamLibraryGame.deleteMany({ where: { userId } }),
    prisma.steamLibrary.deleteMany({ where: { userId } }),
  ]);
