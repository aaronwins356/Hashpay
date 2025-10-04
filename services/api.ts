import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getStoredToken } from './auth';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
export type TransactionDirection = 'inbound' | 'outbound';

export interface WalletBalanceSummary {
  balance: number;
  pending: number;
  depositAddress: string | null;
}

export interface WalletBalance {
  btcBalance: WalletBalanceSummary;
  usdBalance: WalletBalanceSummary;
}

export interface Transaction {
  id: string;
  amountBtc: number | null;
  amountUsd: number | null;
  direction: TransactionDirection;
  status: TransactionStatus;
  txId: string | null;
  createdAt: string;
}

export interface SendBTCResponse {
  txId: string;
  feeBtc: string;
  totalDebitBtc: string;
}

export interface WalletAddressResponse {
  address: string;
}

const API_BASE_URL: string = (() => {
  const manifestBase = (Constants.expoConfig as Record<string, unknown> | undefined)?.extra as
    | { apiBaseUrl?: string }
    | undefined;
  return manifestBase?.apiBaseUrl ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
})();

const MNEMONIC_SECURE_STORE_KEY = 'hashpay.mnemonic';

let authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

const resolveAuthToken = async (): Promise<string | null> => {
  if (authToken) {
    return authToken;
  }
  const stored = await getStoredToken();
  authToken = stored;
  return stored;
};

class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const buildHeaders = (body?: BodyInit | null, extraHeaders?: HeadersInit): Headers => {
  const headers = new Headers(extraHeaders);
  headers.set('Accept', 'application/json');

  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
};

type WalletEndpoint = '/wallet/balance' | '/wallet/history' | '/wallet/send' | '/wallet/address';

interface WalletRouteConfig {
  backendPath: string;
  method: 'GET' | 'POST';
  adaptRequestInit?: (init: RequestInit) => RequestInit;
  adaptResponse?: (payload: unknown) => unknown;
}

interface BackendBalanceSummary {
  balance?: number;
  pending?: number;
  depositAddress?: string | null;
}

interface BackendBalanceResponse {
  btcBalance?: BackendBalanceSummary;
  usdBalance?: BackendBalanceSummary;
}

interface BackendTransaction {
  id: string;
  direction: 'credit' | 'debit';
  status: TransactionStatus;
  currency: 'BTC' | 'USD';
  amount: string | number;
  txHash: string | null;
  createdAt: string | Date;
  metadata?: Record<string, unknown>;
}

const parseNumeric = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const extractNumericMetadata = (
  metadata: Record<string, unknown> | undefined,
  key: string,
): number | null => {
  if (!metadata || !(key in metadata)) {
    return null;
  }
  return parseNumeric(metadata[key]);
};

const adaptBalanceSummary = (summary?: BackendBalanceSummary): WalletBalanceSummary => ({
  balance: typeof summary?.balance === 'number' ? summary.balance : 0,
  pending: typeof summary?.pending === 'number' ? summary.pending : 0,
  depositAddress: typeof summary?.depositAddress === 'string' ? summary.depositAddress : null,
});

const adaptBalancesResponse = (payload: unknown): WalletBalance => {
  const data = payload as BackendBalanceResponse;

  return {
    btcBalance: adaptBalanceSummary(data?.btcBalance),
    usdBalance: adaptBalanceSummary(data?.usdBalance),
  };
};

const adaptTransaction = (transaction: BackendTransaction): Transaction => {
  const metadataAmountBtc = extractNumericMetadata(transaction.metadata, 'amountBtc');
  const metadataAmountUsd = extractNumericMetadata(transaction.metadata, 'amountUsd');

  const rawAmount = parseNumeric(transaction.amount);
  const amountBtc = transaction.currency === 'BTC' ? rawAmount ?? metadataAmountBtc : metadataAmountBtc;
  const amountUsd = transaction.currency === 'USD' ? rawAmount ?? metadataAmountUsd : metadataAmountUsd;

  const createdAt =
    transaction.createdAt instanceof Date
      ? transaction.createdAt.toISOString()
      : transaction.createdAt;

  return {
    id: transaction.id,
    amountBtc,
    amountUsd,
    direction: transaction.direction === 'credit' ? 'inbound' : 'outbound',
    status: transaction.status,
    txId: transaction.txHash,
    createdAt,
  };
};

const adaptTransactionsResponse = (payload: unknown): Transaction[] => {
  const data = payload as { transactions?: BackendTransaction[] };
  if (!Array.isArray(data?.transactions)) {
    return [];
  }
  return data.transactions.map(adaptTransaction);
};

const adaptSendRequestInit = (init: RequestInit): RequestInit => {
  if (!init.body || typeof init.body !== 'string') {
    throw new Error('Send BTC request payload is invalid.');
  }

  let parsed: { address?: string; amount?: number };
  try {
    parsed = JSON.parse(init.body) as { address?: string; amount?: number };
  } catch (error) {
    throw new Error('Send BTC request payload is invalid.');
  }

  const body = JSON.stringify({
    toAddress: parsed.address,
    amountBtc: parsed.amount,
  });

  return { ...init, body };
};

const adaptSendResponse = (payload: unknown): SendBTCResponse => {
  const data = payload as Partial<SendBTCResponse> & { txId?: string };
  if (!data?.txId) {
    throw new Error('Unexpected response from send endpoint.');
  }

  return {
    txId: data.txId,
    feeBtc: data.feeBtc ?? '0',
    totalDebitBtc: data.totalDebitBtc ?? '0',
  };
};

const adaptAddressResponse = (payload: unknown): WalletAddressResponse => {
  const data = payload as { address?: string };
  if (!data?.address) {
    throw new Error('Failed to retrieve a receive address.');
  }
  return { address: data.address };
};

const walletRouteConfigs: Record<WalletEndpoint, WalletRouteConfig> = {
  '/wallet/balance': {
    backendPath: '/v1/balance',
    method: 'GET',
    adaptResponse: adaptBalancesResponse,
  },
  '/wallet/history': {
    backendPath: '/v1/transactions',
    method: 'GET',
    adaptResponse: adaptTransactionsResponse,
  },
  '/wallet/send': {
    backendPath: '/v1/btc/send',
    method: 'POST',
    adaptRequestInit: adaptSendRequestInit,
    adaptResponse: adaptSendResponse,
  },
  '/wallet/address': {
    backendPath: '/v1/btc/address',
    method: 'POST',
    adaptResponse: adaptAddressResponse,
  },
};

const resolveWalletRoute = (
  path: string,
  init: RequestInit,
): { path: string; init: RequestInit; transform?: (payload: unknown) => unknown } => {
  const config = walletRouteConfigs[path as WalletEndpoint];
  if (!config) {
    return { path, init };
  }

  let nextInit: RequestInit = { ...init, method: config.method };

  if (config.method === 'GET') {
    nextInit = { ...nextInit, body: undefined };
  }

  if (config.adaptRequestInit) {
    nextInit = config.adaptRequestInit(nextInit);
  }

  return { path: config.backendPath, init: nextInit, transform: config.adaptResponse };
};

const request = async <T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean } = {},
): Promise<T> => {
  const { authenticated = true } = options;

  const adapted = resolveWalletRoute(path, init);
  const url = `${API_BASE_URL}${adapted.path}`;

  const headers = buildHeaders(adapted.init.body ?? null, adapted.init.headers);

  let token: string | null = null;
  if (authenticated) {
    token = await resolveAuthToken();
    if (!token) {
      throw new ApiError(401, 'Authentication required. Please log in again.');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...adapted.init,
    headers,
    body:
      typeof adapted.init.body === 'string'
        ? adapted.init.body
        : adapted.init.body ?? undefined,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson && payload?.message ? payload.message : response.statusText;
    throw new ApiError(response.status, message || 'Request failed', payload?.details ?? payload);
  }

  const adaptedPayload = adapted.transform ? adapted.transform(payload) : payload;

  return adaptedPayload as T;
};

export const signup = async (email: string, password: string): Promise<string> => {
  const result = await request<{ token: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }, { authenticated: false });

  return result.token;
};

export const login = async (email: string, password: string): Promise<string> => {
  const result = await request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }, { authenticated: false });

  return result.token;
};

export const getBalance = async (): Promise<WalletBalance> => request<WalletBalance>('/wallet/balance');

export const sendBTC = async (address: string, amount: number): Promise<SendBTCResponse> => {
  return request<SendBTCResponse>(
    '/wallet/send',
    {
      method: 'POST',
      body: JSON.stringify({ address, amount })
    }
  );
};

export const getTransactions = async (): Promise<Transaction[]> =>
  request<Transaction[]>('/wallet/history');

export const getAddress = async (): Promise<WalletAddressResponse> =>
  request<WalletAddressResponse>('/wallet/address');

export const exportKeys = async (): Promise<string> => {
  const mnemonic = await SecureStore.getItemAsync(MNEMONIC_SECURE_STORE_KEY);
  if (!mnemonic) {
    throw new Error('No recovery phrase found on this device.');
  }
  return mnemonic;
};
