#!/usr/bin/env bash
# Cleanup expired analyses from FinePrint database
# Usage: ./scripts/cleanup-expired.sh
# Crontab: 0 3 * * 0 /home/hercules/tos-analyzer/scripts/cleanup-expired.sh

set -euo pipefail

CONTAINER="tos-analyzer-postgres"

# Load environment
if [ -f /home/hercules/.secrets/hercules.env ]; then
  source /home/hercules/.secrets/hercules.env
fi

echo "[$(date)] Starting expired data cleanup..."

# Delete expired analytics events (related to expired analyses)
ANALYTICS_DELETED=$(docker exec "$CONTAINER" psql \
  -U "${POSTGRES_USER:-hercules}" \
  -d "${POSTGRES_DB:-hercules_db}" \
  -t -A -c "
    DELETE FROM \"AnalyticsEvent\"
    WHERE \"analysisId\" IN (
      SELECT id FROM \"Analysis\" WHERE \"expiresAt\" < NOW()
    );
    SELECT count(*) FROM (SELECT 1) AS dummy;
  " 2>/dev/null | tail -1)

# Delete expired shares
SHARES_DELETED=$(docker exec "$CONTAINER" psql \
  -U "${POSTGRES_USER:-hercules}" \
  -d "${POSTGRES_DB:-hercules_db}" \
  -t -A -c "
    DELETE FROM \"Share\"
    WHERE \"analysisId\" IN (
      SELECT id FROM \"Analysis\" WHERE \"expiresAt\" < NOW()
    );
  " 2>/dev/null)

# Delete expired analyses
ANALYSES_DELETED=$(docker exec "$CONTAINER" psql \
  -U "${POSTGRES_USER:-hercules}" \
  -d "${POSTGRES_DB:-hercules_db}" \
  -t -A -c "
    WITH deleted AS (
      DELETE FROM \"Analysis\" WHERE \"expiresAt\" < NOW() RETURNING id
    )
    SELECT count(*) FROM deleted;
  " 2>/dev/null)

echo "[$(date)] Cleanup complete: ${ANALYSES_DELETED:-0} expired analyses removed"
echo "[$(date)] Related shares and analytics events also cleaned"
