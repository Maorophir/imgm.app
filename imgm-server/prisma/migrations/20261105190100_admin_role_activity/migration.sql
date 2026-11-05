-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'player';

-- CreateTable
CREATE TABLE "PlayerDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "PlayerDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "note" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerDay_day_idx" ON "PlayerDay"("day");

-- CreateIndex
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAction_targetUserId_idx" ON "AdminAction"("targetUserId");

-- AddForeignKey
ALTER TABLE "PlayerDay" ADD CONSTRAINT "PlayerDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

