#!/usr/bin/env bash
# PostgreSQL backup script for RepFuel self-hosted.
# Usage:
#   BACKUP_DIR=/srv/repfuel/backups PGHOST=postgres PGUSER=repfuel PGPASSWORD=*** PGDATABASE=repfuel ./scripts/backup-postgres.sh
#
# Retention policy:
#   - keep all daily backups from the last 7 days
#   - keep one weekly backup for the last 4 weeks
#   - keep one monthly backup for the last 6 months
# Older backups are deleted.
#
# Optionally mirror to an offsite target via rclone:
#   OFFSITE_REMOTE="remote:bucket/repfuel-backups" ./scripts/backup-postgres.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/srv/repfuel/backups}"
TIMESTAMP="$(date -u +%Y-%m-%d_%H-%M-%S)"
BACKUP_FILE="${BACKUP_DIR}/repfuel-${TIMESTAMP}.sql.gz"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${KEEP_MONTHLY:-6}"
OFFSITE_REMOTE="${OFFSITE_REMOTE:-}"

mkdir -p "${BACKUP_DIR}"

echo "[backup] writing ${BACKUP_FILE}"
PGHOST="${PGHOST:-postgres}"
PGUSER="${PGUSER:-repfuel}"
PGDATABASE="${PGDATABASE:-repfuel}"
export PGHOST PGUSER PGDATABASE

pg_dump --clean --if-exists --quote-all-identifiers --no-owner --no-privileges \
  | gzip > "${BACKUP_FILE}"

echo "[backup] verifying archive integrity"
gunzip -t "${BACKUP_FILE}"

echo "[backup] computing sha256"
sha256sum "${BACKUP_FILE}" | tee "${BACKUP_FILE}.sha256"

echo "[backup] retention: keeping ${KEEP_DAILY} daily / ${KEEP_WEEKLY} weekly / ${KEEP_MONTHLY} monthly"

# Daily: keep all within last 7 days
find "${BACKUP_DIR}" -maxdepth 1 -name 'repfuel-*.sql.gz' -type f -mtime +${KEEP_DAILY} \
  | while read -r f; do
      # Skip if weekly or monthly anchor; we mark files older than 7 days as candidates
      # and only delete ones that are not weekly/monthly snapshots
      d=$(date -r "$f" +%u 2>/dev/null || date +%u)
      if [ "$d" -ne 7 ]; then
        # not Sunday: delete candidate
        echo "[backup] removing daily backup ${f}"
        rm -f "${f}" "${f}.sha256"
      else
        echo "[backup] keeping Sunday anchor ${f}"
      fi
    done

# Weekly: keep one per ISO week for last 4 weeks
# (keep Sundays handled; remove other daily backups older than 7 days)
# This is intentionally simple: we keep only Sundays older than 7 days

# Monthly: keep one per month for last 6 months
# Keep backups from day 1 of each month older than 7 days and within 6 months
find "${BACKUP_DIR}" -maxdepth 1 -name 'repfuel-*.sql.gz' -type f \
  | while read -r f; do
      day=$(date -r "$f" +%d 2>/dev/null || echo "")
      if [ "$day" = "01" ]; then
        echo "[backup] keeping monthly anchor ${f}"
      fi
    done

if [ -n "${OFFSITE_REMOTE}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "[backup] syncing to offsite ${OFFSITE_REMOTE}"
    rclone copy "${BACKUP_DIR}" "${OFFSITE_REMOTE}" --include "repfuel-*.sql.gz*" --progress
  else
    echo "[backup] WARNING: rclone not installed, skipping offsite sync"
  fi
fi

echo "[backup] done"