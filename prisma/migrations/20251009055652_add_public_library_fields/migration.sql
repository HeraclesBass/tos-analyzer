-- AlterTable: Add public library fields to analyses table
ALTER TABLE "analyses" ADD COLUMN "company_name" TEXT,
ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "popularity_score" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: Single column index for filtering public analyses
CREATE INDEX "analyses_is_public_idx" ON "analyses"("is_public");

-- CreateIndex: Composite index for sorting public library by popularity
CREATE INDEX "analyses_is_public_popularity_score_idx" ON "analyses"("is_public", "popularity_score");
