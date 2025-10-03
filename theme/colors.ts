export const colors = {
  background: '#000000',
  accent: '#F7931A',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  cardBackground: '#0D0D0D',
  border: '#1F1F1F',
  success: '#4CAF50',
  error: '#FF5252',
} as const;

export type ColorName = keyof typeof colors;
