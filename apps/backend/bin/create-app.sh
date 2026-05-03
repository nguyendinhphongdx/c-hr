#!/usr/bin/env bash
#
# create-app.sh — bootstrap a new project from this NestJS boilerplate.
#
# Usage:
#   create-app.sh <project-name> [target-dir]
#
# Examples:
#   create-app.sh my-api
#   create-app.sh my-api ~/Code
#
# Behavior:
#   1. Copies this boilerplate into <target-dir>/<project-name>
#      (excluding node_modules, dist, .git, uploads, .env)
#   2. Renames `name` in package.json to <project-name>
#   3. Copies .env.example -> .env
#   4. Initializes a fresh git repo
#   5. Runs `pnpm install` and `pnpm prisma:generate`
set -euo pipefail

PROJECT_NAME="${1:-}"
TARGET_DIR="${2:-$PWD}"

if [[ -z "$PROJECT_NAME" ]]; then
  echo "Usage: create-app.sh <project-name> [target-dir]"
  exit 1
fi

# Resolve absolute path of the boilerplate (this script lives in <root>/bin)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOILERPLATE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DEST="$TARGET_DIR/$PROJECT_NAME"

if [[ -e "$DEST" ]]; then
  echo "✗ Destination already exists: $DEST"
  exit 1
fi

echo "→ Copying boilerplate to: $DEST"
mkdir -p "$DEST"

# Use rsync if available — much cleaner; fall back to cp + manual cleanup.
if command -v rsync >/dev/null 2>&1; then
  rsync -a \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude 'uploads' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude 'coverage' \
    "$BOILERPLATE_DIR/" "$DEST/"
else
  cp -R "$BOILERPLATE_DIR/." "$DEST/"
  rm -rf "$DEST/node_modules" "$DEST/dist" "$DEST/.git" "$DEST/uploads" "$DEST/.env" "$DEST/.env.local" "$DEST/coverage"
fi

cd "$DEST"

echo "→ Setting project name in package.json"
# Portable in-place sed (BSD vs GNU)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"name\": \"nestjs-boilerplate\"/\"name\": \"$PROJECT_NAME\"/" package.json
else
  sed -i "s/\"name\": \"nestjs-boilerplate\"/\"name\": \"$PROJECT_NAME\"/" package.json
fi

if [[ -f .env.example && ! -f .env ]]; then
  echo "→ Creating .env from .env.example"
  cp .env.example .env
fi

if [[ ! -d .git ]]; then
  echo "→ Initializing git repository"
  git init -q
  git add -A
  git commit -q -m "chore: bootstrap from nestjs-boilerplate"
fi

if command -v pnpm >/dev/null 2>&1; then
  echo "→ Installing dependencies (pnpm install)"
  pnpm install
  echo "→ Generating Prisma client"
  pnpm prisma:generate || true
else
  echo "⚠ pnpm not found — skipping install. Run \`pnpm install\` manually."
fi

cat <<EOF

✔ Project ready: $DEST

Next steps:
  cd $DEST
  # 1. Edit .env — set DATABASE_URL, secrets
  # 2. Start infra:    docker compose -f docker-compose.dev.yml up -d
  # 3. Run migration:  pnpm prisma:migrate
  # 4. Seed admin:     pnpm prisma:seed
  # 5. Start dev:      pnpm start:dev

EOF
