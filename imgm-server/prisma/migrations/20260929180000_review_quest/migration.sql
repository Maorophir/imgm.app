-- AlterTable
ALTER TABLE "Review" DROP COLUMN "recommendation",
ADD COLUMN     "badges" TEXT[],
ADD COLUMN     "bestMoment" TEXT,
ADD COLUMN     "comparedAId" INTEGER,
ADD COLUMN     "comparedBId" INTEGER,
ADD COLUMN     "cons" TEXT[],
ADD COLUMN     "gotGoodAfter" TEXT,
ADD COLUMN     "hasSpoilers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pros" TEXT[],
ADD COLUMN     "replay" TEXT,
ADD COLUMN     "scoreGameplay" INTEGER,
ADD COLUMN     "scorePerformance" INTEGER,
ADD COLUMN     "scoreSound" INTEGER,
ADD COLUMN     "scoreStory" INTEGER,
ADD COLUMN     "scoreVisuals" INTEGER,
ADD COLUMN     "vibes" TEXT[],
ADD COLUMN     "worstMoment" TEXT,
ADD COLUMN     "worthPrice" TEXT,
ALTER COLUMN "reviewText" DROP NOT NULL,
DROP COLUMN "hoursPlayed",
ADD COLUMN     "hoursPlayed" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_gameId_key" ON "Review"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_comparedAId_fkey" FOREIGN KEY ("comparedAId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_comparedBId_fkey" FOREIGN KEY ("comparedBId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
