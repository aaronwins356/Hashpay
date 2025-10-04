import { Pool, PoolClient, QueryResult } from 'pg';
import pool, { query, queryWithClient } from '../db';

export type Currency = 'BTC' | 'USD';

export interface WalletRow {
  id: string;
  userId: number;
  currency: Currency;
  balance: string;
  pendingBalance: string;
  depositAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const mapWalletRow = (row: WalletRow): WalletRow => ({
  ...row,
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt)
});

const getExecutor = (client?: PoolClient): Pool | PoolClient => client ?? pool;

export class WalletRepository {
  public static async findByUserAndCurrency(
    userId: number,
    currency: Currency,
    client?: PoolClient
  ): Promise<WalletRow | null> {
    const executor = getExecutor(client);
    const sql = `
      SELECT
        id,
        user_id AS "userId",
        currency,
        balance::text AS "balance",
        pending_balance::text AS "pendingBalance",
        deposit_address AS "depositAddress",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM wallets
      WHERE user_id = $1 AND currency = $2
      LIMIT 1;
    `;

    const result: QueryResult<WalletRow> = await executor.query(sql, [userId, currency]);
    const row = result.rows[0];
    return row ? mapWalletRow(row) : null;
  }

  public static async findByUserAndCurrencyForUpdate(
    userId: number,
    currency: Currency,
    client: PoolClient
  ): Promise<WalletRow | null> {
    const sql = `
      SELECT
        id,
        user_id AS "userId",
        currency,
        balance::text AS "balance",
        pending_balance::text AS "pendingBalance",
        deposit_address AS "depositAddress",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM wallets
      WHERE user_id = $1 AND currency = $2
      FOR UPDATE;
    `;

    const result: QueryResult<WalletRow> = await queryWithClient(client, sql, [userId, currency]);
    const row = result.rows[0];
    return row ? mapWalletRow(row) : null;
  }

  public static async createWallet(
    userId: number,
    currency: Currency,
    client?: PoolClient
  ): Promise<WalletRow> {
    const executor = getExecutor(client);
    const sql = `
      INSERT INTO wallets (user_id, currency)
      VALUES ($1, $2)
      ON CONFLICT (user_id, currency) DO UPDATE SET
        updated_at = now()
      RETURNING
        id,
        user_id AS "userId",
        currency,
        balance::text AS "balance",
        pending_balance::text AS "pendingBalance",
        deposit_address AS "depositAddress",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const result: QueryResult<WalletRow> = await executor.query(sql, [userId, currency]);
    return mapWalletRow(result.rows[0]);
  }

  public static async updateDepositAddress(
    walletId: string,
    address: string,
    client?: PoolClient
  ): Promise<WalletRow> {
    const executor = getExecutor(client);
    const sql = `
      UPDATE wallets
      SET deposit_address = $2, updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        user_id AS "userId",
        currency,
        balance::text AS "balance",
        pending_balance::text AS "pendingBalance",
        deposit_address AS "depositAddress",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const result: QueryResult<WalletRow> = await executor.query(sql, [walletId, address]);
    return mapWalletRow(result.rows[0]);
  }

  public static async adjustBalances(
    walletId: string,
    availableDelta: string,
    pendingDelta: string,
    client: PoolClient
  ): Promise<WalletRow> {
    const sql = `
      UPDATE wallets
      SET
        balance = balance + $2::numeric,
        pending_balance = pending_balance + $3::numeric,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        user_id AS "userId",
        currency,
        balance::text AS "balance",
        pending_balance::text AS "pendingBalance",
        deposit_address AS "depositAddress",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
    `;

    const result: QueryResult<WalletRow> = await queryWithClient(client, sql, [walletId, availableDelta, pendingDelta]);
    return mapWalletRow(result.rows[0]);
  }

  public static async listWalletsForUser(userId: number): Promise<WalletRow[]> {
    const sql = `
      SELECT
        id,
        user_id AS "userId",
        currency,
        balance::text AS "balance",
        pending_balance::text AS "pendingBalance",
        deposit_address AS "depositAddress",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM wallets
      WHERE user_id = $1
      ORDER BY currency;
    `;

    const result: QueryResult<WalletRow> = await query<WalletRow>(sql, [userId]);
    return result.rows.map(mapWalletRow);
  }
}

export default WalletRepository;
