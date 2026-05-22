-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "emails" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "match_breakdown" JSONB,
ADD COLUMN     "match_score" INTEGER;

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "years_of_experience" INTEGER;
