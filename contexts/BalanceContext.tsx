import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBalance, sendBTC as sendBTCApi, type SendBTCResponse, type WalletBalance } from '../services/api';

export interface BalanceContextValue {
  balance: number;
  fiatBalance: number;
  fiatCurrency: string | null;
  pendingBalance: number;
  pendingFiatBalance: number;
  refreshBalance: () => Promise<void>;
  sendBTC: (address: string, amount: number) => Promise<SendBTCResponse>;
}

const BalanceContext = createContext<BalanceContextValue | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(0);
  const [fiatBalance, setFiatBalance] = useState<number>(0);
  const [fiatCurrency, setFiatCurrency] = useState<string | null>(null);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [pendingFiatBalance, setPendingFiatBalance] = useState<number>(0);
  const applyBalance = useCallback((walletBalance: WalletBalance) => {
    setBalance(walletBalance.btcBalance.balance);
    setPendingBalance(walletBalance.btcBalance.pending);
    setFiatBalance(walletBalance.usdBalance.balance);
    setPendingFiatBalance(walletBalance.usdBalance.pending);
    setFiatCurrency('USD');
  }, []);

  const refreshBalance = useCallback(async () => {
    const data = await getBalance();
    applyBalance(data);
  }, [applyBalance]);

  useEffect(() => {
    refreshBalance().catch(error => {
      console.error('Failed to refresh balance:', error);
    });
  }, [refreshBalance]);

  const sendBTC = useCallback(
    async (address: string, amount: number) => {
      const result = await sendBTCApi(address, amount);
      await refreshBalance();
      return result;
    },
    [refreshBalance]
  );

  const value = useMemo(
    () => ({
      balance,
      fiatBalance,
      fiatCurrency,
      pendingBalance,
      pendingFiatBalance,
      refreshBalance,
      sendBTC,
    }),
    [balance, fiatBalance, fiatCurrency, pendingBalance, pendingFiatBalance, refreshBalance, sendBTC]
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
