import React, { createContext, useContext, useMemo, useState } from 'react';

export interface BalanceContextValue {
  balance: number;
  refreshBalance: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextValue | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(0);

  const refreshBalance = async () => {
    // Placeholder implementation until API integration is complete
    setBalance(prev => prev);
  };

  const value = useMemo(
    () => ({
      balance,
      refreshBalance,
    }),
    [balance]
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
