import { Pool, PoolClient, QueryResult } from 'pg';
import config from '../../config';

const pool = new Pool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port
});

pool.on('error', (error: Error) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected database error', error);
});

export type QueryParams = ReadonlyArray<unknown>;

export const query = async <T>(sql: string, params: QueryParams = []): Promise<QueryResult<T>> => {
  return pool.query<T>(sql, params);
};

export const getClient = async (): Promise<PoolClient> => pool.connect();

export default pool;
