export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  surface: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  cardBackground: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  modalBackdrop: string;
}

export const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#050505',
  accent: '#F7931A',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  cardBackground: '#0D0D0D',
  border: '#1F1F1F',
  success: '#4CAF50',
  warning: '#F2A900',
  error: '#FF5252',
  modalBackdrop: 'rgba(0, 0, 0, 0.7)',
};

export const lightColors: ThemeColors = {
  background: '#F7F7F7',
  surface: '#FFFFFF',
  accent: '#F7931A',
  textPrimary: '#1A1A1A',
  textSecondary: '#4F4F4F',
  cardBackground: '#FFFFFF',
  border: '#E0E0E0',
  success: '#2E7D32',
  warning: '#F57C00',
  error: '#D32F2F',
  modalBackdrop: 'rgba(0, 0, 0, 0.4)',
};

export const themePalettes: Record<ThemeMode, ThemeColors> = {
  dark: darkColors,
  light: lightColors,
};

export const getThemeColors = (mode: ThemeMode): ThemeColors => themePalettes[mode];
