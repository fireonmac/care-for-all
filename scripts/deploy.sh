#!/bin/sh

set -eu

source_path="${1:?Usage: deploy.sh SOURCE_PATH DEPLOY_PATH [REVISION]}"
deploy_path="${2:?Usage: deploy.sh SOURCE_PATH DEPLOY_PATH [REVISION]}"
revision="${3:-unknown}"
lock_dir="${deploy_path}.deploy-lock"

case "$deploy_path" in
  ""|"/"|"$HOME")
    echo "Refusing unsafe DEPLOY_PATH: $deploy_path" >&2
    exit 1
    ;;
esac

for command in rsync docker sqlite3; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "Another deployment is already running: $lock_dir" >&2
  exit 1
fi

cleanup() {
  rmdir "$lock_dir"
}
trap cleanup EXIT INT TERM

mkdir -p "$deploy_path"

rsync -a --delete \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude 'app_data/' \
  --exclude 'backups/' \
  "$source_path/" "$deploy_path/"

cd "$deploy_path"

if [ ! -f .env ]; then
  echo "Missing production environment file: $deploy_path/.env" >&2
  echo "Create it from .env.example before the first deployment." >&2
  exit 1
fi

mkdir -p app_data backups

echo "Validating Docker Compose configuration..."
docker compose config >/dev/null

echo "Building application and migration images..."
docker compose build citycare migrate

if [ -s app_data/sqlite.db ]; then
  echo "Backing up the current database..."
  DATABASE_PATH=./app_data/sqlite.db BACKUP_DIR=./backups \
    ./scripts/backup-sqlite.sh
fi

echo "Applying database schema..."
docker compose run --rm migrate

echo "Starting the new application container..."
docker compose up -d --no-deps citycare

echo "Waiting for the application health check..."
attempt=1
max_attempts=30
until docker compose exec -T citycare node -e \
  "fetch('http://127.0.0.1:3000/api/test').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Deployment health check failed." >&2
    docker compose ps >&2
    docker compose logs --tail=200 citycare >&2
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 2
done

printf '%s\n' "$revision" > .deploy-version
echo "Deployment completed: $revision"
