import dotenv from 'dotenv';

dotenv.config();

type RequiredEnvKey =
  | 'DB_HOST'
  | 'DB_USER'
  | 'DB_PASS'
  | 'DB_NAME'
  | 'DB_PORT'
  | 'BTC_RPC_USER'
  | 'BTC_RPC_PASS'
  | 'BTC_RPC_PORT'
  | 'BTC_RPC_HOST'
  | 'JWT_SECRET';

const ensureEnv = (key: RequiredEnvKey): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const parseNumber = (value: string, key: string): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number.`);
  }
  return parsed;
};

const database = {
  host: ensureEnv('DB_HOST'),
  user: ensureEnv('DB_USER'),
  password: ensureEnv('DB_PASS'),
  database: ensureEnv('DB_NAME'),
  port: parseNumber(ensureEnv('DB_PORT'), 'DB_PORT')
};

const bitcoinRpc = {
  host: ensureEnv('BTC_RPC_HOST'),
  port: parseNumber(ensureEnv('BTC_RPC_PORT'), 'BTC_RPC_PORT'),
  username: ensureEnv('BTC_RPC_USER'),
  password: ensureEnv('BTC_RPC_PASS')
};

const jwt = {
  secret: ensureEnv('JWT_SECRET')
};

const server = {
  port: process.env.PORT ? parseNumber(process.env.PORT, 'PORT') : 3000
};

const config = {
  database,
  bitcoinRpc,
  jwt,
  server
};

export type AppConfig = typeof config;

export default config;
