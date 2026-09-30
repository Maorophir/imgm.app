-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- Backfill: give existing reviews the XP the quest would have given them
-- (10 for the rating + 10 per answered screen + 50 for Final words; max 130)
UPDATE "Review" SET "xp" = 10
  + 10 * (
      ("platform" IS NOT NULL OR "hoursPlayed" IS NOT NULL OR "completionStatus" IS NOT NULL OR "playStyle" IS NOT NULL)::int
    + (cardinality("vibes") > 0)::int
    + ("gotGoodAfter" IS NOT NULL)::int
    + (COALESCE("graphics", "gameplay", "audio", "story", "difficulty", "grind", "gameLength",
                "bugs", "pcRequirements", "worthPrice", "replay") IS NOT NULL)::int
    + ("comparedAId" IS NOT NULL OR "comparedBId" IS NOT NULL)::int
    + (cardinality("pros") > 0 OR cardinality("cons") > 0)::int
    + ("bestMoment" IS NOT NULL OR "worstMoment" IS NOT NULL)::int
  )
  + CASE WHEN "reviewText" IS NOT NULL THEN 50 ELSE 0 END;
