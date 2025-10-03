import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getStoredToken, storeToken, clearToken } from '../services/auth';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  token: string | null;
  status: AuthStatus;
  initialize: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const initialize = useCallback(async () => {
    setStatus('loading');
    const storedToken = await getStoredToken();

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (storedToken) {
      setToken(storedToken);
      setStatus('authenticated');
    } else {
      setToken(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const signIn = useCallback(async (nextToken: string) => {
    setStatus('loading');
    await storeToken(nextToken);
    setToken(nextToken);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    setStatus('loading');
    await clearToken();
    setToken(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ token, status, initialize, signIn, signOut }), [
    token,
    status,
    initialize,
    signIn,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
