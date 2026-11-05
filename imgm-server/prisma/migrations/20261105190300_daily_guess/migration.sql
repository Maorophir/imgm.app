-- CreateTable
CREATE TABLE "DailyPuzzle" (
    "day" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "acceptIds" INTEGER[],
    "shots" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPuzzle_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "DailyGuess" (
    "day" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guesses" INTEGER[],
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyGuess_pkey" PRIMARY KEY ("day","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPuzzle_number_key" ON "DailyPuzzle"("number");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPuzzle_gameId_key" ON "DailyPuzzle"("gameId");

-- CreateIndex
CREATE INDEX "DailyGuess_userId_day_idx" ON "DailyGuess"("userId", "day");

-- AddForeignKey
ALTER TABLE "DailyGuess" ADD CONSTRAINT "DailyGuess_day_fkey" FOREIGN KEY ("day") REFERENCES "DailyPuzzle"("day") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyGuess" ADD CONSTRAINT "DailyGuess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
