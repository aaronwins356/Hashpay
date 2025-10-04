import { PoolClient, QueryResult } from 'pg';
import { queryWithClient } from '../db';
import { Currency } from './WalletRepository';

export type LedgerDirection = 'debit' | 'credit';

export interface LedgerEntryRow {
  id: string;
  transactionId: string;
  walletId: string;
  direction: LedgerDirection;
  amount: string;
  currency: Currency;
  createdAt: Date;
}

const mapLedgerRow = (row: LedgerEntryRow): LedgerEntryRow => ({
  ...row,
  createdAt: new Date(row.createdAt)
});

export interface CreateLedgerEntryInput {
  transactionId: string;
  walletId: string;
  direction: LedgerDirection;
  amount: string;
  currency: Currency;
}

export class LedgerRepository {
  public static async create(
    entries: CreateLedgerEntryInput[],
    client: PoolClient
  ): Promise<LedgerEntryRow[]> {
    if (entries.length === 0) {
      return [];
    }

    const sql = `
      INSERT INTO ledger_entries (transaction_id, wallet_id, direction, amount, currency)
      SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::text[], $4::numeric[], $5::text[])
      RETURNING
        id,
        transaction_id AS "transactionId",
        wallet_id AS "walletId",
        direction,
        amount::text AS "amount",
        currency,
        created_at AS "createdAt";
    `;

    const params = [
      entries.map((entry) => entry.transactionId),
      entries.map((entry) => entry.walletId),
      entries.map((entry) => entry.direction),
      entries.map((entry) => entry.amount),
      entries.map((entry) => entry.currency)
    ];

    const result: QueryResult<LedgerEntryRow> = await queryWithClient(client, sql, params);
    return result.rows.map(mapLedgerRow);
  }
}

export default LedgerRepository;
