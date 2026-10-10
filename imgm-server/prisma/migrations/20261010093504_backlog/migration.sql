-- CreateTable
CREATE TABLE "BacklogItem" (
    "userId" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "source" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacklogItem_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateIndex
CREATE INDEX "BacklogItem_userId_addedAt_idx" ON "BacklogItem"("userId", "addedAt");

-- AddForeignKey
ALTER TABLE "BacklogItem" ADD CONSTRAINT "BacklogItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklogItem" ADD CONSTRAINT "BacklogItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
