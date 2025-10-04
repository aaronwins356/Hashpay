import { QueryResult } from 'pg';
import { query } from '../db/db';

export interface Wallet {
  id: number;
  userId: number;
  btcAddress: string;
  label: string;
  createdAt: Date;
}

export class WalletRepository {
  public static async createWallet(userId: number, btcAddress: string, label: string): Promise<Wallet> {
    const insertSql = `
      INSERT INTO wallets (user_id, btc_address, label)
      VALUES ($1, $2, $3)
      RETURNING id, user_id AS "userId", btc_address AS "btcAddress", label, created_at AS "createdAt";
    `;

    const result: QueryResult<Wallet> = await query<Wallet>(insertSql, [userId, btcAddress, label]);
    return result.rows[0];
  }

  public static async getWalletsForUser(userId: number): Promise<Wallet[]> {
    const selectSql = `
      SELECT id, user_id AS "userId", btc_address AS "btcAddress", label, created_at AS "createdAt"
      FROM wallets
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;

    const result: QueryResult<Wallet> = await query<Wallet>(selectSql, [userId]);
    return result.rows;
  }

  public static async getMostRecentWalletForUser(userId: number): Promise<Wallet | null> {
    const selectSql = `
      SELECT id, user_id AS "userId", btc_address AS "btcAddress", label, created_at AS "createdAt"
      FROM wallets
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result: QueryResult<Wallet> = await query<Wallet>(selectSql, [userId]);
    return result.rows[0] ?? null;
  }

  public static async findByAddress(address: string): Promise<Wallet | null> {
    const selectSql = `
      SELECT id, user_id AS "userId", btc_address AS "btcAddress", label, created_at AS "createdAt"
      FROM wallets
      WHERE btc_address = $1
      LIMIT 1;
    `;

    const result: QueryResult<Wallet> = await query<Wallet>(selectSql, [address]);
    return result.rows[0] ?? null;
  }
}

export default WalletRepository;
