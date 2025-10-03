import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ThemeColors, ThemeMode, themePalettes } from '../theme/colors';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const toggleTheme = useCallback(() => {
    setMode(current => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const colors = themePalettes[mode];

  const value = useMemo(
    () => ({
      mode,
      colors,
      toggleTheme,
    }),
    [mode, colors, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
