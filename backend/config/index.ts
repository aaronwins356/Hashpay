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

const parseNumberOptional = (value: string | undefined, key: string, defaultValue: number): number => {
  if (value === undefined) {
    return defaultValue;
  }
  return parseNumber(value, key);
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

const fiat = {
  currency: (process.env.FIAT_CURRENCY ?? 'USD').toUpperCase(),
  exchangeRateApiUrl:
    process.env.EXCHANGE_RATE_API_URL ?? 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
  cacheTtlMs: parseNumberOptional(
    process.env.EXCHANGE_RATE_CACHE_MS,
    'EXCHANGE_RATE_CACHE_MS',
    60_000
  ),
  defaultUsdPerBtc: parseNumberOptional(
    process.env.DEFAULT_USD_PER_BTC,
    'DEFAULT_USD_PER_BTC',
    30_000
  )
};

const blockchainWatcher = {
  pollIntervalMs: parseNumberOptional(
    process.env.WATCHER_POLL_INTERVAL_MS,
    'WATCHER_POLL_INTERVAL_MS',
    30_000
  ),
  minConfirmations: parseNumberOptional(
    process.env.WATCHER_MIN_CONFIRMATIONS,
    'WATCHER_MIN_CONFIRMATIONS',
    1
  )
};

const jwt = {
  secret: ensureEnv('JWT_SECRET')
};

const server = {
  port: process.env.PORT ? parseNumber(process.env.PORT, 'PORT') : 3000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rateLimit: {
    windowMs: parseNumberOptional(process.env.RATE_LIMIT_WINDOW_MS, 'RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    maxRequests: parseNumberOptional(process.env.RATE_LIMIT_MAX, 'RATE_LIMIT_MAX', 100)
  },
  enforceHttps: (process.env.ENFORCE_HTTPS ?? 'true').toLowerCase() !== 'false'
};

const wallet = {
  maxWithdrawBtc: parseNumberOptional(process.env.MAX_WITHDRAW_BTC, 'MAX_WITHDRAW_BTC', 0.05)
};

const config = {
  database,
  bitcoinRpc,
  fiat,
  blockchainWatcher,
  jwt,
  server,
  wallet
};

export type AppConfig = typeof config;

export default config;
