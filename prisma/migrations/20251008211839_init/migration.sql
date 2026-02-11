-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('paste', 'upload', 'url');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('analysis_created', 'analysis_viewed', 'share_created', 'share_viewed', 'pdf_exported', 'error_occurred');

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "source_url" TEXT,
    "analysis_data" JSONB NOT NULL,
    "word_count" INTEGER NOT NULL,
    "char_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "session_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT,
    "event_type" "EventType" NOT NULL,
    "session_hash" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_analyses" INTEGER NOT NULL DEFAULT 0,
    "total_shares" INTEGER NOT NULL DEFAULT 0,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "unique_sessions" INTEGER NOT NULL DEFAULT 0,
    "source_breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analyses_content_hash_key" ON "analyses"("content_hash");

-- CreateIndex
CREATE INDEX "analyses_content_hash_idx" ON "analyses"("content_hash");

-- CreateIndex
CREATE INDEX "analyses_created_at_idx" ON "analyses"("created_at");

-- CreateIndex
CREATE INDEX "analyses_expires_at_idx" ON "analyses"("expires_at");

-- CreateIndex
CREATE INDEX "shares_analysis_id_idx" ON "shares"("analysis_id");

-- CreateIndex
CREATE INDEX "shares_session_hash_idx" ON "shares"("session_hash");

-- CreateIndex
CREATE INDEX "shares_created_at_idx" ON "shares"("created_at");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "analytics_events_timestamp_idx" ON "analytics_events"("timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_session_hash_idx" ON "analytics_events"("session_hash");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summaries_date_key" ON "daily_summaries"("date");

-- CreateIndex
CREATE INDEX "daily_summaries_date_idx" ON "daily_summaries"("date");

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
