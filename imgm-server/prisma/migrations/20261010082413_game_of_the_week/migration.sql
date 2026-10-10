-- CreateTable
CREATE TABLE "GotwWeek" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "winnerId" INTEGER,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GotwWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GotwCandidate" (
    "weekId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "GotwCandidate_pkey" PRIMARY KEY ("weekId","gameId")
);

-- CreateTable
CREATE TABLE "GotwVote" (
    "weekId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GotwVote_pkey" PRIMARY KEY ("weekId","userId")
);

-- CreateIndex
CREATE INDEX "GotwVote_weekId_gameId_idx" ON "GotwVote"("weekId", "gameId");

-- AddForeignKey
ALTER TABLE "GotwWeek" ADD CONSTRAINT "GotwWeek_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotwCandidate" ADD CONSTRAINT "GotwCandidate_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "GotwWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotwCandidate" ADD CONSTRAINT "GotwCandidate_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotwVote" ADD CONSTRAINT "GotwVote_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "GotwWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotwVote" ADD CONSTRAINT "GotwVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotwVote" ADD CONSTRAINT "GotwVote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
