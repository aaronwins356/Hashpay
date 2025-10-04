import { QueryResult } from 'pg';
import { query } from '../db/db';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
export type TransactionDirection = 'inbound' | 'outbound';

export interface Transaction {
  id: number;
  userId: number;
  txid: string | null;
  amountSats: string;
  networkFee: string;
  serviceFee: string;
  status: TransactionStatus;
  direction: TransactionDirection;
  fiatAmount: string | null;
  fiatCurrency: string | null;
  exchangeRate: string | null;
  confirmations: number;
  confirmedAt: Date | null;
  createdAt: Date;
}

const toBigIntParam = (value: bigint | number | string): string => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return Math.trunc(value).toString();
  }

  return value;
};

const toNumericParam = (value: number | string | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  return value;
};

const toDateParam = (value: Date | string | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

interface FiatMetadata {
  fiatAmount?: number | string | null;
  fiatCurrency?: string | null;
  exchangeRate?: number | string | null;
}

interface ConfirmationMetadata {
  confirmations?: number;
  confirmedAt?: Date | string | null;
}

export class TransactionRepository {
  private static mapTransactionRow(row: Transaction): Transaction {
    return {
      ...row,
      confirmedAt: row.confirmedAt ? new Date(row.confirmedAt) : null,
      createdAt: new Date(row.createdAt)
    };
  }

  public static async logTransaction(
    userId: number,
    txid: string | null,
    amountSats: bigint | number | string,
    networkFee: bigint | number | string,
    serviceFee: bigint | number | string,
    status: TransactionStatus,
    direction: TransactionDirection,
    metadata: FiatMetadata & ConfirmationMetadata = {}
  ): Promise<Transaction> {
    const insertSql = `
      INSERT INTO transactions (
        user_id,
        txid,
        amount_sats,
        network_fee,
        service_fee,
        status,
        direction,
        fiat_amount,
        fiat_currency,
        exchange_rate,
        confirmations,
        confirmed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING
        id,
        user_id AS "userId",
        txid,
        amount_sats::text AS "amountSats",
        network_fee::text AS "networkFee",
        service_fee::text AS "serviceFee",
        status,
        direction,
        fiat_amount::text AS "fiatAmount",
        fiat_currency AS "fiatCurrency",
        exchange_rate::text AS "exchangeRate",
        confirmations,
        confirmed_at AS "confirmedAt",
        created_at AS "createdAt";
    `;

    const params = [
      userId,
      txid,
      toBigIntParam(amountSats),
      toBigIntParam(networkFee),
      toBigIntParam(serviceFee),
      status,
      direction,
      toNumericParam(metadata.fiatAmount),
      metadata.fiatCurrency ?? null,
      toNumericParam(metadata.exchangeRate),
      metadata.confirmations ?? 0,
      toDateParam(metadata.confirmedAt)
    ];

    const result: QueryResult<Transaction> = await query<Transaction>(insertSql, params);
    return this.mapTransactionRow(result.rows[0]);
  }

  public static async logPendingSend(
    userId: number,
    txid: string,
    amountSats: bigint | number | string,
    networkFee: bigint | number | string,
    serviceFee: bigint | number | string,
    metadata: FiatMetadata & ConfirmationMetadata = {}
  ): Promise<Transaction> {
    return this.logTransaction(
      userId,
      txid,
      amountSats,
      networkFee,
      serviceFee,
      'pending',
      'outbound',
      metadata
    );
  }

  public static async upsertInboundTransaction(
    userId: number,
    txid: string,
    amountSats: bigint | number | string,
    status: TransactionStatus,
    metadata: FiatMetadata & ConfirmationMetadata = {}
  ): Promise<Transaction> {
    const upsertSql = `
      INSERT INTO transactions (
        user_id,
        txid,
        amount_sats,
        network_fee,
        service_fee,
        status,
        direction,
        fiat_amount,
        fiat_currency,
        exchange_rate,
        confirmations,
        confirmed_at
      )
      VALUES ($1, $2, $3, 0, 0, $4, 'inbound', $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, txid, direction)
      DO UPDATE SET
        amount_sats = EXCLUDED.amount_sats,
        status = EXCLUDED.status,
        fiat_amount = EXCLUDED.fiat_amount,
        fiat_currency = EXCLUDED.fiat_currency,
        exchange_rate = EXCLUDED.exchange_rate,
        confirmations = EXCLUDED.confirmations,
        confirmed_at = EXCLUDED.confirmed_at,
        network_fee = EXCLUDED.network_fee,
        service_fee = EXCLUDED.service_fee
      RETURNING
        id,
        user_id AS "userId",
        txid,
        amount_sats::text AS "amountSats",
        network_fee::text AS "networkFee",
        service_fee::text AS "serviceFee",
        status,
        direction,
        fiat_amount::text AS "fiatAmount",
        fiat_currency AS "fiatCurrency",
        exchange_rate::text AS "exchangeRate",
        confirmations,
        confirmed_at AS "confirmedAt",
        created_at AS "createdAt";
    `;

    const params = [
      userId,
      txid,
      toBigIntParam(amountSats),
      status,
      toNumericParam(metadata.fiatAmount),
      metadata.fiatCurrency ?? null,
      toNumericParam(metadata.exchangeRate),
      metadata.confirmations ?? 0,
      toDateParam(metadata.confirmedAt)
    ];

    const result: QueryResult<Transaction> = await query<Transaction>(upsertSql, params);
    return this.mapTransactionRow(result.rows[0]);
  }

  public static async updateConfirmationMetadata(
    transactionId: number,
    status: TransactionStatus,
    metadata: FiatMetadata & ConfirmationMetadata
  ): Promise<Transaction> {
    const updateSql = `
      UPDATE transactions
      SET
        status = $2,
        fiat_amount = $3,
        fiat_currency = $4,
        exchange_rate = $5,
        confirmations = $6,
        confirmed_at = $7
      WHERE id = $1
      RETURNING
        id,
        user_id AS "userId",
        txid,
        amount_sats::text AS "amountSats",
        network_fee::text AS "networkFee",
        service_fee::text AS "serviceFee",
        status,
        direction,
        fiat_amount::text AS "fiatAmount",
        fiat_currency AS "fiatCurrency",
        exchange_rate::text AS "exchangeRate",
        confirmations,
        confirmed_at AS "confirmedAt",
        created_at AS "createdAt";
    `;

    const params = [
      transactionId,
      status,
      toNumericParam(metadata.fiatAmount),
      metadata.fiatCurrency ?? null,
      toNumericParam(metadata.exchangeRate),
      metadata.confirmations ?? 0,
      toDateParam(metadata.confirmedAt)
    ];

    const result: QueryResult<Transaction> = await query<Transaction>(updateSql, params);
    return this.mapTransactionRow(result.rows[0]);
  }

  public static async findByTxid(
    txid: string,
    direction?: TransactionDirection
  ): Promise<Transaction | null> {
    const selectSql = `
      SELECT
        id,
        user_id AS "userId",
        txid,
        amount_sats::text AS "amountSats",
        network_fee::text AS "networkFee",
        service_fee::text AS "serviceFee",
        status,
        direction,
        fiat_amount::text AS "fiatAmount",
        fiat_currency AS "fiatCurrency",
        exchange_rate::text AS "exchangeRate",
        confirmations,
        confirmed_at AS "confirmedAt",
        created_at AS "createdAt"
      FROM transactions
      WHERE txid = $1
      ${direction ? "AND direction = $2" : ''}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const params = direction ? [txid, direction] : [txid];
    const result: QueryResult<Transaction> = await query<Transaction>(selectSql, params);
    const row = result.rows[0];
    return row ? this.mapTransactionRow(row) : null;
  }

  public static async getTransactionsForUser(userId: number): Promise<Transaction[]> {
    const selectSql = `
      SELECT
        id,
        user_id AS "userId",
        txid,
        amount_sats::text AS "amountSats",
        network_fee::text AS "networkFee",
        service_fee::text AS "serviceFee",
        status,
        direction,
        fiat_amount::text AS "fiatAmount",
        fiat_currency AS "fiatCurrency",
        exchange_rate::text AS "exchangeRate",
        confirmations,
        confirmed_at AS "confirmedAt",
        created_at AS "createdAt"
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;

    const result: QueryResult<Transaction> = await query<Transaction>(selectSql, [userId]);
    return result.rows.map(this.mapTransactionRow);
  }

  public static async getUserBalanceSummary(
    userId: number
  ): Promise<{ confirmedSats: bigint; pendingSats: bigint }> {
    const summarySql = `
      SELECT
        (
          COALESCE(SUM(CASE WHEN direction = 'inbound' AND status = 'confirmed' THEN amount_sats ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN direction = 'outbound' AND status = 'confirmed' THEN amount_sats + network_fee + service_fee ELSE 0 END), 0)
        )::text AS "confirmedSats",
        (
          COALESCE(SUM(CASE WHEN direction = 'inbound' AND status = 'pending' THEN amount_sats ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN direction = 'outbound' AND status = 'pending' THEN amount_sats + network_fee + service_fee ELSE 0 END), 0)
        )::text AS "pendingSats"
      FROM transactions
      WHERE user_id = $1;
    `;

    const result: QueryResult<{ confirmedSats: string | null; pendingSats: string | null }> =
      await query(summarySql, [userId]);

    const row = result.rows[0] ?? { confirmedSats: '0', pendingSats: '0' };

    return {
      confirmedSats: BigInt(row.confirmedSats ?? '0'),
      pendingSats: BigInt(row.pendingSats ?? '0')
    };
  }
}

export default TransactionRepository;
