import { QueryResult } from 'pg';
import { query } from '../db/db';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: number;
  userId: number;
  txid: string | null;
  amountSats: string;
  networkFee: string;
  serviceFee: string;
  status: TransactionStatus;
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

export class TransactionRepository {
  public static async logTransaction(
    userId: number,
    txid: string | null,
    amountSats: bigint | number | string,
    networkFee: bigint | number | string,
    serviceFee: bigint | number | string,
    status: TransactionStatus
  ): Promise<Transaction> {
    const insertSql = `
      INSERT INTO transactions (user_id, txid, amount_sats, network_fee, service_fee, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        user_id AS "userId",
        txid,
        amount_sats::text AS "amountSats",
        network_fee::text AS "networkFee",
        service_fee::text AS "serviceFee",
        status,
        created_at AS "createdAt";
    `;

    const params = [
      userId,
      txid,
      toBigIntParam(amountSats),
      toBigIntParam(networkFee),
      toBigIntParam(serviceFee),
      status
    ];

    const result: QueryResult<Transaction> = await query<Transaction>(insertSql, params);
    return result.rows[0];
  }

  public static async logPendingSend(
    userId: number,
    txid: string,
    amountSats: bigint | number | string,
    networkFee: bigint | number | string,
    serviceFee: bigint | number | string
  ): Promise<Transaction> {
    return this.logTransaction(userId, txid, amountSats, networkFee, serviceFee, 'pending');
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
        created_at AS "createdAt"
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;

    const result: QueryResult<Transaction> = await query<Transaction>(selectSql, [userId]);
    return result.rows;
  }
}

export default TransactionRepository;
