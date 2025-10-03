import { QueryResult } from 'pg';
import { query } from '../db/db';

export interface Wallet {
  id: number;
  userId: number;
  btcAddress: string;
  createdAt: Date;
}

export class WalletRepository {
  public static async createWallet(userId: number, btcAddress: string): Promise<Wallet> {
    const insertSql = `
      INSERT INTO wallets (user_id, btc_address)
      VALUES ($1, $2)
      RETURNING id, user_id AS "userId", btc_address AS "btcAddress", created_at AS "createdAt";
    `;

    const result: QueryResult<Wallet> = await query<Wallet>(insertSql, [userId, btcAddress]);
    return result.rows[0];
  }

  public static async getWalletsForUser(userId: number): Promise<Wallet[]> {
    const selectSql = `
      SELECT id, user_id AS "userId", btc_address AS "btcAddress", created_at AS "createdAt"
      FROM wallets
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;

    const result: QueryResult<Wallet> = await query<Wallet>(selectSql, [userId]);
    return result.rows;
  }
}

export default WalletRepository;
