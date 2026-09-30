#!/usr/bin/env bash
# PostgreSQL restore script for RepFuel self-hosted.
# Usage:
#   PGHOST=postgres PGUSER=repfuel PGPASSWORD=*** PGDATABASE=repfuel ./scripts/restore-postgres.sh /path/to/backup.sql.gz
#
# This will:
#   1. Terminate active connections to the target DB
#   2. Drop and recreate the database
#   3. Stream the backup through gunzip into psql

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

BACKUP="$1"

if [ ! -f "${BACKUP}" ]; then
  echo "[restore] backup not found: ${BACKUP}" >&2
  exit 1
fi

# Verify sha256 if present
if [ -f "${BACKUP}.sha256" ]; then
  echo "[restore] verifying sha256"
  expected="$(cat "${BACKUP}.sha256" | awk '{print $1}')"
  actual="$(sha256sum "${BACKUP}" | awk '{print $1}')"
  if [ "${expected}" != "${actual}" ]; then
    echo "[restore] sha256 mismatch!" >&2
    echo "  expected: ${expected}" >&2
    echo "  actual:   ${actual}" >&2
    exit 1
  fi
fi

# Verify gzip integrity
echo "[restore] verifying gzip integrity"
gunzip -t "${BACKUP}"

PGHOST="${PGHOST:-postgres}"
PGUSER="${PGUSER:-repfuel}"
PGDATABASE="${PGDATABASE:-repfuel}"
export PGHOST PGUSER PGDATABASE

echo "[restore] WARNING: this will DROP database ${PGDATABASE} and restore from ${BACKUP}"
echo "Press Ctrl+C within 5 seconds to abort"
sleep 5

echo "[restore] terminating connections"
psql -v ON_ERROR_STOP=1 -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();" || true

echo "[restore] dropping database"
psql -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE IF EXISTS \"${PGDATABASE}\";"

echo "[restore] creating database"
psql -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE \"${PGDATABASE}\" OWNER \"${PGUSER}\";"

echo "[restore] streaming backup"
gunzip -c "${BACKUP}" | psql -v ON_ERROR_STOP=1 -d "${PGDATABASE}" -f -

echo "[restore] done"
echo "[restore] verifying row counts"
psql -v ON_ERROR_STOP=1 -d "${PGDATABASE}" -c "
  SELECT 'users' AS table, COUNT(*) FROM \"User\"
  UNION ALL SELECT 'workouts', COUNT(*) FROM \"Workout\"
  UNION ALL SELECT 'routines', COUNT(*) FROM \"Routine\"
  UNION ALL SELECT 'food_entries', COUNT(*) FROM \"FoodEntry\"
  UNION ALL SELECT 'body_weights', COUNT(*) FROM \"BodyWeightEntry\";
"