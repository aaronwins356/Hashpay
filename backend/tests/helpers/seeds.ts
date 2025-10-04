import type { Pool } from 'pg';

export const insertUser = async (pool: Pool, email = 'test@example.com'): Promise<number> => {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
    [email, '$2a$10$testhash']
  );

  return result.rows[0].id;
};

