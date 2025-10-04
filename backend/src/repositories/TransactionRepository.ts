import { PoolClient, QueryResult } from 'pg';
import pool, { query, queryWithClient } from '../db';
import { Currency } from './WalletRepository';

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'conversion' | 'fee' | 'rate_adjustment';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
export type TransactionDirection = 'debit' | 'credit';

export interface TransactionRow {
  id: string;
  userId: number;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  currency: Currency;
  amount: string;
  feeAmount: string;
  description: string | null;
  txHash: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const mapTransactionRow = (row: TransactionRow): TransactionRow => ({
  ...row,
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt)
});

export interface CreateTransactionInput {
  userId: number;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  currency: Currency;
  amount: string;
  feeAmount?: string;
  description?: string;
  txHash?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ListTransactionsFilters {
  userId: number;
  limit: number;
  offset: number;
}

export class TransactionRepository {
  public static async create(
    input: CreateTransactionInput,
    client?: PoolClient
  ): Promise<TransactionRow> {
    const sql = `
      INSERT INTO transactions (
        user_id,
        type,
        direction,
        status,
        currency,
        amount,
        fee_amount,
        description,
        tx_hash,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6::numeric, COALESCE($7, '0')::numeric, $8, $9, COALESCE($10, '{}'::jsonb))
      RETURNING
        id,
        user_id AS "userId",
        type,
        direction,
        status,
        currency,
        amount::text AS "amount",
        fee_amount::text AS "feeAmount",
        description,
        tx_hash AS "txHash",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const params = [
      input.userId,
      input.type,
      input.direction,
      input.status,
      input.currency,
      input.amount,
      input.feeAmount ?? '0',
      input.description ?? null,
      input.txHash ?? null,
      JSON.stringify(input.metadata ?? {})
    ];

    const executor = client ?? pool;
    const result: QueryResult<TransactionRow> = await executor.query(sql, params);
    return mapTransactionRow(result.rows[0]);
  }

  public static async updateStatus(
    id: string,
    status: TransactionStatus,
    client?: PoolClient,
    metadata: Record<string, unknown> = {}
  ): Promise<TransactionRow> {
    const sql = `
      UPDATE transactions
      SET status = $2, metadata = metadata || $3::jsonb, updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        user_id AS "userId",
        type,
        direction,
        status,
        currency,
        amount::text AS "amount",
        fee_amount::text AS "feeAmount",
        description,
        tx_hash AS "txHash",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const params = [id, status, JSON.stringify(metadata)];
    const executor = client ?? pool;
    const result: QueryResult<TransactionRow> = await executor.query(sql, params);
    return mapTransactionRow(result.rows[0]);
  }

  public static async updateMetadata(
    id: string,
    metadata: Record<string, unknown>,
    client?: PoolClient
  ): Promise<TransactionRow> {
    const sql = `
      UPDATE transactions
      SET metadata = metadata || $2::jsonb, updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        user_id AS "userId",
        type,
        direction,
        status,
        currency,
        amount::text AS "amount",
        fee_amount::text AS "feeAmount",
        description,
        tx_hash AS "txHash",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const executor = client ?? pool;
    const result: QueryResult<TransactionRow> = await executor.query(sql, [id, JSON.stringify(metadata)]);
    return mapTransactionRow(result.rows[0]);
  }

  public static async findByHash(
    txHash: string,
    client?: PoolClient,
    userId?: number
  ): Promise<TransactionRow | null> {
    const executor = client ?? pool;
    const conditions: string[] = ['tx_hash = $1'];
    const params: (string | number)[] = [txHash];

    if (typeof userId === 'number') {
      conditions.push('user_id = $2');
      params.push(userId);
    }

    const sql = `
      SELECT
        id,
        user_id AS "userId",
        type,
        direction,
        status,
        currency,
        amount::text AS "amount",
        fee_amount::text AS "feeAmount",
        description,
        tx_hash AS "txHash",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM transactions
      WHERE ${conditions.join(' AND ')}
      LIMIT 1;
    `;

    const result: QueryResult<TransactionRow> = await executor.query(sql, params);
    const row = result.rows[0];
    return row ? mapTransactionRow(row) : null;
  }

  public static async list(filters: ListTransactionsFilters): Promise<TransactionRow[]> {
    const sql = `
      SELECT
        id,
        user_id AS "userId",
        type,
        direction,
        status,
        currency,
        amount::text AS "amount",
        fee_amount::text AS "feeAmount",
        description,
        tx_hash AS "txHash",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const result: QueryResult<TransactionRow> = await query<TransactionRow>(sql, [
      filters.userId,
      filters.limit,
      filters.offset
    ]);

    return result.rows.map(mapTransactionRow);
  }

  public static async attachHash(
    id: string,
    txHash: string,
    client: PoolClient
  ): Promise<TransactionRow> {
    const sql = `
      UPDATE transactions
      SET tx_hash = $2, updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        user_id AS "userId",
        type,
        direction,
        status,
        currency,
        amount::text AS "amount",
        fee_amount::text AS "feeAmount",
        description,
        tx_hash AS "txHash",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const result: QueryResult<TransactionRow> = await queryWithClient(client, sql, [id, txHash]);
    return mapTransactionRow(result.rows[0]);
  }
}

export default TransactionRepository;
