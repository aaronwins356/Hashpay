import { Pool, PoolClient, QueryResult } from 'pg';
import config from '../../config';

const pool = new Pool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port
});

pool.on('error', (error: unknown) => {
  const normalized = error instanceof Error ? error : new Error(String(error));
  // eslint-disable-next-line no-console
  console.error('Unexpected database error', normalized);
});

export type QueryParams = unknown[];

export const query = async <T>(sql: string, params: QueryParams = []): Promise<QueryResult<T>> => {
  return pool.query<T>(sql, params);
};

export const withTransaction = async <T>(handler: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const queryWithClient = async <T>(
  client: PoolClient,
  sql: string,
  params: QueryParams = []
): Promise<QueryResult<T>> => {
  return client.query<T>(sql, params);
};

export const getClient = async (): Promise<PoolClient> => pool.connect();

export default pool;
