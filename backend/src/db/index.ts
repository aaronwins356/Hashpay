import { Pool } from 'pg';
import config from '../../config';

const pool = new Pool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port
});

pool.on('error', (err: Error) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected database error', err);
});

export const query = async <T>(text: string, params?: unknown[]): Promise<T[]> => {
  const result = await pool.query<T>(text, params);
  return result.rows;
};

export const getClient = async () => pool.connect();

export default pool;
