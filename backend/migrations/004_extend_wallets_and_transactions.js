'use strict';

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = pgm => {
  pgm.addColumn('wallets', {
    label: { type: 'text', notNull: true, default: '' }
  });

  pgm.addConstraint('wallets', 'wallets_user_address_unique', {
    unique: ['user_id', 'btc_address']
  });

  pgm.addColumn('transactions', {
    direction: {
      type: 'text',
      notNull: true,
      default: 'outbound',
      check: "direction IN ('inbound','outbound')"
    },
    fiat_amount: { type: 'numeric(24,2)' },
    fiat_currency: { type: 'text' },
    exchange_rate: { type: 'numeric(24,8)' },
    confirmations: { type: 'integer', notNull: true, default: 0 },
    confirmed_at: { type: 'timestamp' }
  });

  pgm.createIndex('transactions', ['user_id', 'txid', 'direction'], {
    name: 'transactions_user_txid_direction_unique',
    unique: true,
    where: 'txid IS NOT NULL'
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = pgm => {
  pgm.dropIndex('transactions', ['user_id', 'txid', 'direction'], {
    name: 'transactions_user_txid_direction_unique'
  });

  pgm.dropColumn('transactions', [
    'direction',
    'fiat_amount',
    'fiat_currency',
    'exchange_rate',
    'confirmations',
    'confirmed_at'
  ]);

  pgm.dropConstraint('wallets', 'wallets_user_address_unique');
  pgm.dropColumn('wallets', 'label');
};
