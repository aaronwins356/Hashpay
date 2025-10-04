import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

type TestDatabase = {
  db: unknown;
  pool: Pool;
};

const loadPgMem = () => {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    return require('pg-mem') as { newDb: (options?: { autoCreateForeignKeyIndices?: boolean }) => unknown };
  } catch (error) {
    throw new Error('pg-mem module is required to run integration tests.');
  }
};

const SCHEMA_SQL = [
  `CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );`,
  `CREATE TABLE wallets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT NOT NULL CHECK (currency IN ('BTC','USD')),
      balance NUMERIC(30,8) NOT NULL DEFAULT 0,
      pending_balance NUMERIC(30,8) NOT NULL DEFAULT 0,
      deposit_address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    );`,
  `CREATE UNIQUE INDEX wallets_user_currency_unique ON wallets(user_id, currency);`,
  `CREATE TABLE transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','transfer','conversion','fee','rate_adjustment')),
      direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
      currency TEXT NOT NULL CHECK (currency IN ('BTC','USD')),
      amount NUMERIC(30,8) NOT NULL,
      fee_amount NUMERIC(30,8) NOT NULL DEFAULT 0,
      description TEXT,
      tx_hash TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    );`,
  `CREATE INDEX transactions_user_created_idx ON transactions(user_id, created_at);`,
  `CREATE INDEX transactions_tx_hash_idx ON transactions(tx_hash);`,
  `CREATE TABLE ledger_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK (direction IN ('debit','credit')),
      amount NUMERIC(30,8) NOT NULL,
      currency TEXT NOT NULL CHECK (currency IN ('BTC','USD')),
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );`,
  `CREATE INDEX ledger_entries_wallet_idx ON ledger_entries(wallet_id);`,
  `CREATE INDEX ledger_entries_transaction_idx ON ledger_entries(transaction_id);`,
  `CREATE TABLE exchange_rates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      base_currency TEXT NOT NULL,
      quote_currency TEXT NOT NULL,
      raw_rate NUMERIC(30,8) NOT NULL,
      fee_rate NUMERIC(6,4) NOT NULL,
      final_rate NUMERIC(30,8) NOT NULL,
      fetched_at TIMESTAMP NOT NULL DEFAULT now()
    );`,
  `CREATE INDEX exchange_rates_lookup_idx ON exchange_rates(base_currency, quote_currency, fetched_at);`
];

const registerFunctions = (db: any): void => {
  db.public.registerFunction({
    name: 'now',
    returns: 'timestamp',
    implementation: () => new Date(),
  });

  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: 'uuid',
    implementation: randomUUID,
  });
};

export const createInMemoryDatabase = async (): Promise<TestDatabase> => {
  const { newDb } = loadPgMem();
  const memDb: any = (newDb as (options?: { autoCreateForeignKeyIndices?: boolean }) => unknown)({
    autoCreateForeignKeyIndices: true,
  });
  registerFunctions(memDb);
  const adapter = memDb.adapters.createPg();

  const pg = require('pg') as typeof import('pg');
  pg.Pool = adapter.Pool;
  pg.Client = adapter.Client;

  const pool = new adapter.Pool();

  for (const statement of SCHEMA_SQL) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(statement);
  }

  return { db: memDb, pool };
};

export const resetModuleCache = (): void => {
  const modulePaths = [
    '../../src/db',
    '../../src/db/db',
    '../../src/services/WalletService',
    '../../src/services/ConversionService',
    '../../src/services/BitcoinService',
    '../../src/repositories/WalletRepository',
    '../../src/repositories/TransactionRepository',
    '../../src/repositories/LedgerRepository',
  ];

  for (const modulePath of modulePaths) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
  }
};

export const destroyDatabase = async (pool: Pool): Promise<void> => {
  await pool.end();
};

