'use strict';

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('transactions', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'cascade' },
    txid: { type: 'text' },
    amount_sats: { type: 'bigint', notNull: true },
    network_fee: { type: 'bigint', notNull: true },
    service_fee: { type: 'bigint', notNull: true },
    status: {
      type: 'text',
      notNull: true,
      check: "status IN ('pending','confirmed','failed')"
    },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.addIndex('transactions', ['user_id']);
  pgm.addIndex('transactions', ['txid']);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('transactions');
};
