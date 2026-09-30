-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "screenshots" TEXT[];

-- Data: mark every cached game as out of date, so each one is re-fetched from
-- IGDB (now with screenshots) the next time its page is opened
UPDATE "Game" SET "updatedAt" = '2000-01-01';
