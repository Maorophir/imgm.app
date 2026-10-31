-- CreateTable
CREATE TABLE "DiscoverVote" (
    "userId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoverVote_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateIndex
CREATE INDEX "DiscoverVote_gameId_idx" ON "DiscoverVote"("gameId");

-- AddForeignKey
ALTER TABLE "DiscoverVote" ADD CONSTRAINT "DiscoverVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
