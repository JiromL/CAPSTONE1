#!/bin/bash
# Migrate local MongoDB data to MongoDB Atlas
# Usage: bash scripts/migrate-to-atlas.sh "mongodb+srv://user:pass@cluster.mongodb.net"

set -e

ATLAS_URI="${1}"
LOCAL_DB="cps_system_dev"
ATLAS_DB="cps_system"
DUMP_DIR="/tmp/cps_migration_$(date +%Y%m%d_%H%M%S)"

if [ -z "$ATLAS_URI" ]; then
  echo "Usage: bash scripts/migrate-to-atlas.sh \"mongodb+srv://user:pass@cluster.mongodb.net\""
  exit 1
fi

echo "📦 Dumping local MongoDB database: $LOCAL_DB"
mongodump --db "$LOCAL_DB" --out "$DUMP_DIR"

echo "☁️  Restoring to MongoDB Atlas as: $ATLAS_DB"
mongorestore \
  --uri "$ATLAS_URI" \
  --db "$ATLAS_DB" \
  --drop \
  "$DUMP_DIR/$LOCAL_DB"

echo "✅ Migration complete. Dump saved at: $DUMP_DIR"
echo ""
echo "Next: update MONGODB_URI in your Render environment variables to:"
echo "  $ATLAS_URI"
echo "And set MONGODB_DB_NAME to: $ATLAS_DB"
