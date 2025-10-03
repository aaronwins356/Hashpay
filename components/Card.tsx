import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../contexts/ThemeContext';

export interface CardProps extends ViewProps {
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      shadowColor: colors.accent,
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 3,
    },
    bordered: {
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

export const Card: React.FC<CardProps> = ({ bordered = true, style, children, ...rest }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.base, bordered && styles.bordered, style]} {...rest}>
      {children}
    </View>
  );
};

export default Card;
