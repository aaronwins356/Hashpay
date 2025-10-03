
const MOCK_LATENCY = 1200;

const MOCK_BTC_PRICE = 42650;

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  txid: string;
  amount: number;
  status: TransactionStatus;
  date: string;
}

const BASE_TRANSACTIONS: Array<Omit<Transaction, 'date'>> = [
  { txid: 'mock-txid-1', amount: 0.01234567, status: 'confirmed' },
  { txid: 'mock-txid-2', amount: 0.25, status: 'pending' },
  { txid: 'mock-txid-3', amount: 0.005, status: 'failed' },
  { txid: 'mock-txid-4', amount: 0.047, status: 'confirmed' },
  { txid: 'mock-txid-5', amount: 0.0012, status: 'confirmed' },
  { txid: 'mock-txid-6', amount: 0.18, status: 'pending' },
];

const MOCK_SEED_PHRASE = 'arena hollow gadget mirror canyon ribbon cousin august brave torch remove lend';

const createMockToken = (email: string) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const encodedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
  return `mock.${encodedEmail}.${issuedAt}`;
};

const delay = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export const signup = async (email: string, password: string): Promise<string> => {
  await delay(MOCK_LATENCY);

  if (!email || !password) {
    throw new Error('Missing signup credentials.');
  }

  return createMockToken(email.trim().toLowerCase());
};

export const login = async (email: string, password: string): Promise<string> => {
  await delay(MOCK_LATENCY);

  if (!email || !password) {
    throw new Error('Missing login credentials.');
  }

  return createMockToken(email.trim().toLowerCase());
};

export const getBalance = async (): Promise<{ btc: number; fiat: number }> => {
  await delay(MOCK_LATENCY / 2);

  const btc = Number((Math.random() * 0.75 + 0.05).toFixed(8));
  const fiat = Number((btc * MOCK_BTC_PRICE).toFixed(2));

  return { btc, fiat };
};

export const sendBTC = async (address: string, amount: number): Promise<{ txid: string }> => {
  await delay(MOCK_LATENCY);

  if (!address || amount <= 0) {
    throw new Error('Invalid transaction payload.');
  }

  if (!address.startsWith('1') && !address.startsWith('3') && !address.startsWith('bc1')) {
    throw new Error('Unsupported BTC address format.');
  }

  if (amount > 2) {
    throw new Error('Amount exceeds mock transfer limit.');
  }

  const txid = `mock-txid-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

  return { txid };
};

export const getTransactions = async (): Promise<Transaction[]> => {
  await delay(MOCK_LATENCY / 2);
  const now = Date.now();

  return BASE_TRANSACTIONS.map((transaction, index) => ({
    ...transaction,
    date: new Date(now - index * 1000 * 60 * 90).toISOString(),
  }));
};

export const exportKeys = async (): Promise<string> => {
  await delay(MOCK_LATENCY / 2);
  return MOCK_SEED_PHRASE;
};

export const getAddress = async (): Promise<string> => {
  await delay(MOCK_LATENCY / 3);

  return 'bc1qhashpaymockaddress0000000000000000000000';
};
