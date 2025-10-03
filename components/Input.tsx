import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

export interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  error?: string;
  numeric?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  containerStyle,
  error,
  onFocus,
  onBlur,
  secureTextEntry,
  numeric = false,
  keyboardType,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(error);

  const handleFocus: TextInputProps['onFocus'] = event => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur: TextInputProps['onBlur'] = event => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.accent}
        style={[
          styles.input,
          isFocused && styles.focusedInput,
          secureTextEntry && styles.secureFont,
          hasError && styles.errorInput,
        ]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={numeric ? 'decimal-pad' : keyboardType}
        {...rest}
      />
      <View
        style={[styles.underline, isFocused && styles.focusedUnderline, hasError && styles.errorUnderline]}
      />
      {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  secureFont: {
    letterSpacing: 2,
  },
  underline: {
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 12,
  },
  focusedInput: {
    color: colors.textPrimary,
  },
  focusedUnderline: {
    backgroundColor: colors.accent,
  },
  errorInput: {
    color: colors.textPrimary,
  },
  errorUnderline: {
    backgroundColor: colors.error,
  },
  errorText: {
    color: colors.error,
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default Input;
