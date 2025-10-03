import { QueryResult } from 'pg';
import { query, QueryParams } from '../db/db';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export class UserRepository {
  public static async createUser(email: string, passwordHash: string): Promise<User> {
    const insertSql = `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, password_hash AS "passwordHash", created_at AS "createdAt";
    `;

    const params: QueryParams = [email, passwordHash];
    const result: QueryResult<User> = await query<User>(insertSql, params);
    return result.rows[0];
  }

  public static async findUserByEmail(email: string): Promise<User | null> {
    const selectSql = `
      SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt"
      FROM users
      WHERE email = $1
      LIMIT 1;
    `;

    const result: QueryResult<User> = await query<User>(selectSql, [email]);
    return result.rows[0] ?? null;
  }

  public static async findUserById(id: number): Promise<User | null> {
    const selectSql = `
      SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt"
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;

    const result: QueryResult<User> = await query<User>(selectSql, [id]);
    return result.rows[0] ?? null;
  }
}

export default UserRepository;
