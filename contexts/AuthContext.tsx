import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { login as loginRequest, setAuthToken, signup as signupRequest } from '../services/api';
import { clearToken, getStoredToken, storeToken } from '../services/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  userToken: string | null;
  loading: boolean;
  error: string | null;
  status: AuthStatus;
  initialize: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  biometricLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const hasBootstrappedRef = useRef(false);

  const initialize = useCallback(async () => {
    if (hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const token = await getStoredToken();
      if (token) {
        setAuthToken(token);
        setUserToken(token);
      } else {
        setUserToken(null);
      }
    } catch (initializationError) {
      const message = resolveErrorMessage(initializationError, 'Unable to restore your session.');
      setError(message);
      console.warn('Auth initialization error:', initializationError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const handleAuthSuccess = useCallback(async (token: string) => {
    await storeToken(token);
    setAuthToken(token);
    setUserToken(token);
  }, []);

  const signup = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const token = await signupRequest(email, password);
        await handleAuthSuccess(token);
      } catch (signupError) {
        const message = resolveErrorMessage(signupError, 'Unable to create your account.');
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [handleAuthSuccess]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const token = await loginRequest(email, password);
        await handleAuthSuccess(token);
      } catch (loginError) {
        const message = resolveErrorMessage(loginError, 'Unable to log you in.');
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [handleAuthSuccess]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await clearToken();
      setAuthToken(null);
      setUserToken(null);
    } catch (logoutError) {
      const message = resolveErrorMessage(logoutError, 'Unable to log you out.');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const biometricLogin = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        throw new Error('Biometric authentication is not available on this device.');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with FaceID/TouchID',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        const errorMessage = result.error === 'user_cancel'
          ? 'Biometric authentication was cancelled.'
          : 'Biometric authentication failed.';
        throw new Error(errorMessage);
      }

      const token = await getStoredToken();
      if (!token) {
        throw new Error('No saved session found. Please login with your password first.');
      }

      setAuthToken(token);
      setUserToken(token);
    } catch (biometricError) {
      const message = resolveErrorMessage(biometricError, 'Unable to log you in with biometrics.');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const status: AuthStatus = loading ? 'loading' : userToken ? 'authenticated' : 'unauthenticated';

  const value = useMemo<AuthContextValue>(
    () => ({ userToken, loading, error, status, initialize, signup, login, logout, biometricLogin }),
    [userToken, loading, error, status, initialize, signup, login, logout, biometricLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
