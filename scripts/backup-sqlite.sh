#!/bin/sh

set -eu

database_path="${DATABASE_PATH:-./app_data/sqlite.db}"
backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date '+%Y%m%d-%H%M%S')"
backup_path="${backup_dir}/sqlite-${timestamp}.db"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 is required to create a consistent online backup." >&2
  exit 1
fi

if [ ! -f "$database_path" ]; then
  echo "Database not found: $database_path" >&2
  exit 1
fi

mkdir -p "$backup_dir"
sqlite3 "$database_path" ".backup '$backup_path'"
echo "Backup created: $backup_path"
