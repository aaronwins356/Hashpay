import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ThemeColors } from './colors';
import { useTheme } from '../contexts/ThemeContext';

export const createTypography = (colors: ThemeColors) =>
  StyleSheet.create({
    heading: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subheading: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    body: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    caption: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    monospace: {
      fontFamily: 'Courier',
      color: colors.textPrimary,
    },
  });

export const createLayout = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    spacer: {
      height: 24,
    },
  });

export type TypographyStyles = ReturnType<typeof createTypography>;
export type LayoutStyles = ReturnType<typeof createLayout>;

export const useThemedStyles = (): { typography: TypographyStyles; layout: LayoutStyles } => {
  const { colors } = useTheme();

  return useMemo(
    () => ({
      typography: createTypography(colors),
      layout: createLayout(colors),
    }),
    [colors]
  );
};
