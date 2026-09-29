-- AlterTable
ALTER TABLE "Review" DROP COLUMN "scoreGameplay",
DROP COLUMN "scorePerformance",
DROP COLUMN "scoreSound",
DROP COLUMN "scoreStory",
DROP COLUMN "scoreVisuals",
ADD COLUMN     "audio" TEXT,
ADD COLUMN     "bugs" TEXT,
ADD COLUMN     "gameLength" TEXT,
ADD COLUMN     "gameplay" TEXT,
ADD COLUMN     "graphics" TEXT,
ADD COLUMN     "grind" TEXT,
ADD COLUMN     "pcRequirements" TEXT,
ADD COLUMN     "story" TEXT;

-- Data: the Beta Tester badge was retired
UPDATE "Review" SET "badges" = array_remove("badges", 'beta_tester');

-- Data: map the old difficulty values onto the new checklist ladder
-- ('easy' and 'hard' exist in both)
UPDATE "Review" SET "difficulty" = CASE "difficulty"
    WHEN 'normal' THEN 'learn_master'
    WHEN 'extreme' THEN 'dark_souls'
    ELSE "difficulty"
  END
WHERE "difficulty" IS NOT NULL;
