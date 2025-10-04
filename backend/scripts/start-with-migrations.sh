#!/bin/sh
set -e

# Ensure database migrations run before starting the server.
node scripts/run-migrations.js

exec node dist/src/server.js
