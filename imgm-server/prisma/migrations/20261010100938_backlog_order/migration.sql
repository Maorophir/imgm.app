-- DropIndex
DROP INDEX "BacklogItem_userId_addedAt_idx";

-- AlterTable
ALTER TABLE "BacklogItem" ADD COLUMN     "position" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "BacklogItem_userId_position_idx" ON "BacklogItem"("userId", "position");
