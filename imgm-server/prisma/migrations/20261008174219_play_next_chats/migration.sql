-- CreateTable
CREATE TABLE "PlayNextChat" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "turns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayNextChat_pkey" PRIMARY KEY ("userId","id")
);

-- CreateIndex
CREATE INDEX "PlayNextChat_userId_updatedAt_idx" ON "PlayNextChat"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "PlayNextChat" ADD CONSTRAINT "PlayNextChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
