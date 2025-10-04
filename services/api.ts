import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getStoredToken } from './auth';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
export type TransactionDirection = 'inbound' | 'outbound';

export interface WalletBalanceLineItem {
  sats: string;
  btc: number;
  fiat: number | null;
  fiatCurrency: string | null;
}

export interface WalletBalance {
  confirmed: WalletBalanceLineItem;
  pending: WalletBalanceLineItem;
  exchangeRate: {
    fiatPerBtc: number;
    currency: string;
    asOf: string;
  } | null;
}

export interface Transaction {
  id: number;
  txid: string | null;
  direction: TransactionDirection;
  status: TransactionStatus;
  amountBtc: number;
  networkFeeBtc: number;
  serviceFeeBtc: number;
  fiatAmount: number | null;
  fiatCurrency: string | null;
  exchangeRate: number | null;
  confirmations: number;
  confirmedAt: string | null;
  createdAt: string;
}

export interface SendBTCResponse {
  txid: string;
  amountBtc: number;
  serviceFeeBtc: number;
  networkFeeBtc: number;
  fiatAmount: number | null;
  fiatCurrency: string | null;
  exchangeRate: number | null;
  status: TransactionStatus;
}

const API_BASE_URL: string = (() => {
  const manifestBase = (Constants.expoConfig as Record<string, unknown> | undefined)?.extra as
    | { apiBaseUrl?: string }
    | undefined;
  return manifestBase?.apiBaseUrl ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
})();

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

const request = async <T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean } = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;
  const { authenticated = true } = options;

  const headers = buildHeaders(init.body ?? null, init.headers);

  let token: string | null = null;
  if (authenticated) {
    token = await resolveAuthToken();
    if (!token) {
      throw new ApiError(401, 'Authentication required. Please log in again.');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    body: typeof init.body === 'string' ? init.body : init.body ?? undefined
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson && payload?.message ? payload.message : response.statusText;
    throw new ApiError(response.status, message || 'Request failed', payload?.details ?? payload);
  }

  return payload as T;
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

export const getBalance = async (): Promise<WalletBalance> => {
  const result = await request<{ balance: WalletBalance }>('/wallet/balance');
  return result.balance;
};

export const sendBTC = async (address: string, amount: number): Promise<SendBTCResponse> => {
  return request<SendBTCResponse>(
    '/wallet/send',
    {
      method: 'POST',
      body: JSON.stringify({ address, amount })
    }
  );
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const result = await request<{ transactions: Transaction[] }>('/wallet/history');
  return result.transactions;
};

export const getAddress = async (): Promise<string> => {
  const result = await request<{ address: string }>('/wallet/address');
  return result.address;
};

export const exportKeys = async (): Promise<string> => {
  throw new Error('Key export is not yet available from the mobile client.');
};
