-- Steam: connecting a Steam account (a login row in "Account") and the player's imported
-- library. Better Auth finds a login by its issuer + account id; this makes that unique, so
-- one Steam account can't be connected to two players. (Rows without an issuer don't clash:
-- Postgres counts NULLs as different.)

-- CreateIndex
CREATE UNIQUE INDEX "Account_issuer_accountId_key" ON "Account"("issuer", "accountId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateTable
CREATE TABLE "SteamApp" (
    "appid" INTEGER NOT NULL,
    "gameId" INTEGER,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "coverUrl" TEXT,
    "releaseDate" TIMESTAMP(3),
    "platforms" TEXT[],
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SteamApp_pkey" PRIMARY KEY ("appid")
);

-- CreateTable
CREATE TABLE "SteamLibrary" (
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "gameCount" INTEGER NOT NULL DEFAULT 0,
    "hoursHidden" BOOLEAN NOT NULL DEFAULT false,
    "personaName" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SteamLibrary_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SteamLibraryGame" (
    "userId" TEXT NOT NULL,
    "appid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "minutes2Weeks" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),

    CONSTRAINT "SteamLibraryGame_pkey" PRIMARY KEY ("userId","appid")
);

-- CreateIndex
CREATE INDEX "SteamApp_gameId_idx" ON "SteamApp"("gameId");

-- AddForeignKey
ALTER TABLE "SteamLibrary" ADD CONSTRAINT "SteamLibrary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamLibraryGame" ADD CONSTRAINT "SteamLibraryGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
