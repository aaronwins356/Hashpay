import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getBalance,
  getTransactions,
  sendBTC as sendBTCApi,
  type BalanceSummary,
  type SendBTCResponse,
  type Transaction,
  type WalletSnapshot,
} from '../services/api';
import { useAuth } from './AuthContext';

const REFRESH_INTERVAL_MS = 30_000;

type RefreshOptions = { silent?: boolean };

interface WalletBalancesState {
  btc: BalanceSummary;
  usd: BalanceSummary;
}

interface WalletRatesState {
  usdPerBtc: number;
}

export interface BalanceContextValue {
  balances: WalletBalancesState;
  rates: WalletRatesState;
  transactions: Transaction[];
  balancesReady: boolean;
  transactionsReady: boolean;
  refreshBalances: (options?: RefreshOptions) => Promise<void>;
  refreshTransactions: (options?: RefreshOptions) => Promise<void>;
  sendBTC: (address: string, amount: number) => Promise<SendBTCResponse>;
}

const EMPTY_BALANCE: BalanceSummary = {
  balance: 0,
  pending: 0,
  depositAddress: null,
};

const BalanceContext = createContext<BalanceContextValue | undefined>(undefined);

const cloneBalance = (balance: BalanceSummary): BalanceSummary => ({
  balance: balance.balance,
  pending: balance.pending,
  depositAddress: balance.depositAddress,
});

const buildInitialBalances = (): WalletBalancesState => ({
  btc: cloneBalance(EMPTY_BALANCE),
  usd: cloneBalance(EMPTY_BALANCE),
});

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const [balances, setBalances] = useState<WalletBalancesState>(buildInitialBalances);
  const [rates, setRates] = useState<WalletRatesState>({ usdPerBtc: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balancesReady, setBalancesReady] = useState(false);
  const [transactionsReady, setTransactionsReady] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  const applySnapshot = useCallback((snapshot: WalletSnapshot) => {
    if (!mountedRef.current) {
      return;
    }

    setBalances({
      btc: cloneBalance(snapshot.balances.btc),
      usd: cloneBalance(snapshot.balances.usd),
    });
    setRates({ usdPerBtc: snapshot.rates.usdPerBtc });
    setBalancesReady(true);
  }, []);

  const refreshBalances = useCallback(async ({ silent = false }: RefreshOptions = {}) => {
    try {
      const snapshot = await getBalance();
      applySnapshot(snapshot);
    } catch (error) {
      if (silent) {
        return;
      }

      console.error('Failed to refresh balances:', error);
      throw error instanceof Error ? error : new Error('Unable to refresh balances.');
    }
  }, [applySnapshot]);

  const refreshTransactions = useCallback(async ({ silent = false }: RefreshOptions = {}) => {
    try {
      const data = await getTransactions();
      if (!mountedRef.current) {
        return;
      }
      setTransactions(data);
      setTransactionsReady(true);
    } catch (error) {
      if (silent) {
        return;
      }

      console.error('Failed to refresh transactions:', error);
      throw error instanceof Error ? error : new Error('Unable to refresh transactions.');
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      setBalances(buildInitialBalances());
      setRates({ usdPerBtc: 0 });
      setTransactions([]);
      setBalancesReady(false);
      setTransactionsReady(false);
      return;
    }

    void Promise.all([
      refreshBalances(),
      refreshTransactions(),
    ]).catch(error => {
      console.error('Failed to initialise wallet data:', error);
    });

    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(() => {
      void refreshBalances({ silent: true });
      void refreshTransactions({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [status, refreshBalances, refreshTransactions]);

  const sendBTC = useCallback(
    async (address: string, amount: number) => {
      const result = await sendBTCApi(address, amount);
      await Promise.all([
        refreshBalances({ silent: true }),
        refreshTransactions({ silent: true }),
      ]);
      return result;
    },
    [refreshBalances, refreshTransactions]
  );

  const value = useMemo(
    () => ({
      balances,
      rates,
      transactions,
      balancesReady,
      transactionsReady,
      refreshBalances,
      refreshTransactions,
      sendBTC,
    }),
    [
      balances,
      rates,
      transactions,
      balancesReady,
      transactionsReady,
      refreshBalances,
      refreshTransactions,
      sendBTC,
    ]
  );

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
};

export const useBalance = (): BalanceContextValue => {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
};

