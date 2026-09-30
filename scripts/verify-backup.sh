#!/usr/bin/env bash
# Verify a RepFuel PostgreSQL backup by restoring into a TEMP database.
# Usage:
#   PGHOST=postgres PGUSER=repfuel PGPASSWORD=*** PGDATABASE=repfuel ./scripts/verify-backup.sh /path/to/backup.sql.gz

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

BACKUP="$1"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
VERIFY_DB="repfuel_verify_${TIMESTAMP}"

PGHOST="${PGHOST:-postgres}"
PGUSER="${PGUSER:-repfuel}"
export PGHOST PGUSER

cleanup() {
  echo "[verify] cleaning up temp database ${VERIFY_DB}"
  psql -v ON_ERROR_STOP=1 -d postgres -c "
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${VERIFY_DB}' AND pid <> pg_backend_pid();
  " >/dev/null 2>&1 || true
  psql -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE IF EXISTS \"${VERIFY_DB}\";" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[verify] sha256 + gzip integrity"
if [ -f "${BACKUP}.sha256" ]; then
  expected="$(cat "${BACKUP}.sha256" | awk '{print $1}')"
  actual="$(sha256sum "${BACKUP}" | awk '{print $1}')"
  if [ "${expected}" != "${actual}" ]; then
    echo "[verify] FAIL: sha256 mismatch"
    exit 1
  fi
fi
gunzip -t "${BACKUP}"

echo "[verify] creating temp database ${VERIFY_DB}"
psql -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE IF EXISTS \"${VERIFY_DB}\";"
psql -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE \"${VERIFY_DB}\" OWNER \"${PGUSER}\";"

echo "[verify] restoring"
gunzip -c "${BACKUP}" | psql -v ON_ERROR_STOP=1 -d "${VERIFY_DB}" -f - >/dev/null

echo "[verify] checking schema"
psql -v ON_ERROR_STOP=1 -d "${VERIFY_DB}" -c "\dt" | head -20

echo "[verify] counting rows"
psql -v ON_ERROR_STOP=1 -d "${VERIFY_DB}" -c "
  SELECT 'users' AS table, COUNT(*) AS rows FROM \"User\"
  UNION ALL SELECT 'workouts', COUNT(*) FROM \"Workout\"
  UNION ALL SELECT 'routines', COUNT(*) FROM \"Routine\"
  UNION ALL SELECT 'food_entries', COUNT(*) FROM \"FoodEntry\"
  UNION ALL SELECT 'body_weights', COUNT(*) FROM \"BodyWeightEntry\";
"

echo "[verify] OK — backup is restorable"