#!/bin/sh
set -e

echo "Running database migrations..."
cd apps/api && npx prisma migrate deploy
cd /app

echo "Migrations complete."

echo "Starting application..."
exec node apps/api/dist/src/main
