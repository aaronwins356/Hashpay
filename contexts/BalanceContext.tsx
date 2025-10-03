import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBalance, sendBTC as sendBTCApi } from '../services/api';

export interface SendBTCResult {
  txid: string;
}

export interface BalanceContextValue {
  balance: number;
  fiatBalance: number;
  refreshBalance: () => Promise<void>;
  sendBTC: (address: string, amount: number) => Promise<SendBTCResult>;
}

const BalanceContext = createContext<BalanceContextValue | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(0);
  const [fiatBalance, setFiatBalance] = useState<number>(0);

  const refreshBalance = useCallback(async () => {
    const { btc, fiat } = await getBalance();
    setBalance(btc);
    setFiatBalance(fiat);
  }, []);

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
      refreshBalance,
      sendBTC,
    }),
    [balance, fiatBalance, refreshBalance, sendBTC]
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
