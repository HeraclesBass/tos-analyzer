#!/usr/bin/env bash
# Database backup script for FinePrint (tos-analyzer)
# Usage: ./scripts/backup-db.sh
# Crontab: 0 2 * * * /home/hercules/tos-analyzer/scripts/backup-db.sh

set -euo pipefail

BACKUP_DIR="/home/hercules/backups/tos-analyzer"
RETENTION_DAYS=30
CONTAINER="tos-analyzer-postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tos-analyzer_${TIMESTAMP}.sql.gz"

# Load environment
if [ -f /home/hercules/.secrets/hercules.env ]; then
  source /home/hercules/.secrets/hercules.env
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "[$(date)] Starting database backup..."
docker exec "$CONTAINER" pg_dump \
  -U "${POSTGRES_USER:-hercules}" \
  -d "${POSTGRES_DB:-hercules_db}" \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

# Verify backup is non-empty
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[$(date)] ERROR: Backup file is empty, removing"
  rm -f "$BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# Clean up old backups
DELETED=$(find "$BACKUP_DIR" -name "tos-analyzer_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned up $DELETED old backups (>${RETENTION_DAYS} days)"
fi

echo "[$(date)] Backup finished successfully"
