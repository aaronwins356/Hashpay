'use strict';

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addExtension('uuid-ossp', { ifNotExists: true });

  pgm.dropTable('ledger_entries', { ifExists: true, cascade: true });
  pgm.dropTable('transactions', { ifExists: true, cascade: true });
  pgm.dropTable('wallets', { ifExists: true, cascade: true });
  pgm.dropTable('exchange_rates', { ifExists: true, cascade: true });

  pgm.createTable('wallets', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'cascade' },
    currency: {
      type: 'text',
      notNull: true,
      check: "currency IN ('BTC','USD')"
    },
    balance: { type: 'numeric(30,8)', notNull: true, default: 0 },
    pending_balance: { type: 'numeric(30,8)', notNull: true, default: 0 },
    deposit_address: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.addConstraint('wallets', 'wallets_user_currency_unique', {
    unique: ['user_id', 'currency']
  });

  pgm.createTable('transactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'cascade' },
    type: {
      type: 'text',
      notNull: true,
      check: "type IN ('deposit','withdrawal','transfer','conversion','fee','rate_adjustment')"
    },
    direction: {
      type: 'text',
      notNull: true,
      check: "direction IN ('debit','credit')"
    },
    status: {
      type: 'text',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending','confirmed','failed')"
    },
    currency: {
      type: 'text',
      notNull: true,
      check: "currency IN ('BTC','USD')"
    },
    amount: { type: 'numeric(30,8)', notNull: true },
    fee_amount: { type: 'numeric(30,8)', notNull: true, default: 0 },
    description: { type: 'text' },
    tx_hash: { type: 'text' },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("jsonb_build_object()") },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('transactions', ['user_id', 'created_at']);
  pgm.createIndex('transactions', ['tx_hash']);

  pgm.createTable('ledger_entries', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    transaction_id: {
      type: 'uuid',
      notNull: true,
      references: 'transactions',
      onDelete: 'cascade'
    },
    wallet_id: {
      type: 'uuid',
      notNull: true,
      references: 'wallets',
      onDelete: 'cascade'
    },
    direction: {
      type: 'text',
      notNull: true,
      check: "direction IN ('debit','credit')"
    },
    amount: { type: 'numeric(30,8)', notNull: true },
    currency: {
      type: 'text',
      notNull: true,
      check: "currency IN ('BTC','USD')"
    },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('ledger_entries', ['wallet_id']);
  pgm.createIndex('ledger_entries', ['transaction_id']);

  pgm.createTable('exchange_rates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    base_currency: { type: 'text', notNull: true },
    quote_currency: { type: 'text', notNull: true },
    raw_rate: { type: 'numeric(30,8)', notNull: true },
    fee_rate: { type: 'numeric(6,4)', notNull: true },
    final_rate: { type: 'numeric(30,8)', notNull: true },
    fetched_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.createIndex('exchange_rates', ['base_currency', 'quote_currency', 'fetched_at']);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropIndex('exchange_rates', ['base_currency', 'quote_currency', 'fetched_at'], {
    ifExists: true
  });
  pgm.dropTable('exchange_rates', { ifExists: true, cascade: true });

  pgm.dropIndex('ledger_entries', ['wallet_id'], { ifExists: true });
  pgm.dropIndex('ledger_entries', ['transaction_id'], { ifExists: true });
  pgm.dropTable('ledger_entries', { ifExists: true, cascade: true });

  pgm.dropIndex('transactions', ['user_id', 'created_at'], { ifExists: true });
  pgm.dropIndex('transactions', ['tx_hash'], { ifExists: true });
  pgm.dropTable('transactions', { ifExists: true, cascade: true });

  pgm.dropConstraint('wallets', 'wallets_user_currency_unique', { ifExists: true });
  pgm.dropTable('wallets', { ifExists: true, cascade: true });
};
