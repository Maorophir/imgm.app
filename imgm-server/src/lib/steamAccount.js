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
// Better Auth finds a login by issuer + account id. A constant that never changes:
// changing it would hide every connected Steam account from sign-in.
export const STEAM_ISSUER = 'https://steamcommunity.com/openid';

// The player's public Steam profile page
export const steamProfileUrl = (steamId) => `https://steamcommunity.com/profiles/${steamId}`;

// The SteamID64 of the player's connected Steam account, or null
export const findSteamId = async (userId) => {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: STEAM_PROVIDER, issuer: STEAM_ISSUER },
    select: { accountId: true },
  });
  return account?.accountId ?? null;
};

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
