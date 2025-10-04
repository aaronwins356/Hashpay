#!/bin/sh
set -e

node scripts/run-migrations.js

exec node dist/src/workers/blockchainWatcher.js
