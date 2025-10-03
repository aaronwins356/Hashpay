import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../contexts/ThemeContext';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accent,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
    },
    fullWidth: {
      alignSelf: 'stretch',
    },
    disabled: {
      opacity: 0.6,
    },
    pressed: {
      transform: [{ scale: 0.98 }],
    },
    label: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });

export const Button: React.FC<ButtonProps> = ({
  label,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: `${colors.textPrimary}20`, borderless: false }}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
};

export default Button;
