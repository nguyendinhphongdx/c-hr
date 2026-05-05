#!/bin/sh
set -e

echo "▶ Running migrations..."
node_modules/.bin/prisma migrate deploy

echo "▶ Seeding data..."
node dist/cli/cli.js seed

echo "▶ Starting server..."
exec node dist/main.js
