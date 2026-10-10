-- CreateTable
CREATE TABLE "GotwNomination" (
    "weekId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GotwNomination_pkey" PRIMARY KEY ("weekId","userId")
);

-- CreateIndex
CREATE INDEX "GotwNomination_weekId_gameId_idx" ON "GotwNomination"("weekId", "gameId");

-- AddForeignKey
ALTER TABLE "GotwNomination" ADD CONSTRAINT "GotwNomination_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "GotwWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotwNomination" ADD CONSTRAINT "GotwNomination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GotwNomination" ADD CONSTRAINT "GotwNomination_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
