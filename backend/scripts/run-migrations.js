#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { run } = require('node-pg-migrate');

const buildDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS } = process.env;

  if (DB_HOST && DB_PORT && DB_NAME && DB_USER && DB_PASS) {
    const user = encodeURIComponent(DB_USER);
    const password = encodeURIComponent(DB_PASS);
    return `postgresql://${user}:${password}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  }

  throw new Error(
    'DATABASE_URL or DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASS environment variables must be set to run migrations.'
  );
};

run({
  databaseUrl: buildDatabaseUrl(),
  dir: 'migrations',
  direction: 'up',
  migrationsTable: 'pgmigrations'
})
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Database migrations completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Database migrations failed.', error);
    process.exit(1);
  });
