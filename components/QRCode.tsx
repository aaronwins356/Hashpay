import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../contexts/ThemeContext';

export interface QRCodeProps {
  value: string;
  size?: number;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: 24,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  });

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 220 }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const safeValue = value?.trim().length ? value : ' ';

  return (
    <View style={styles.container}>
      <QRCodeSVG value={safeValue} size={size} backgroundColor="transparent" color={colors.textPrimary} />
    </View>
  );
};

export default QRCode;
