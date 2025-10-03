
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../components/Button';
import { QRCode } from '../components/QRCode';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles, TypographyStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import { getAddress } from '../services/api';

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('HASH', message);
  }
};

const createStyles = (colors: ThemeColors, typography: TypographyStyles) =>
  StyleSheet.create({
    safeArea: {
      paddingTop: 32,
    },
    container: {
      flex: 1,
      justifyContent: 'space-between',
      paddingBottom: 48,
    },
    title: {
      ...typography.heading,
      marginBottom: 8,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: 32,
    },
    qrWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
    },
    errorContainer: {
      alignItems: 'center',
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      marginBottom: 16,
      textAlign: 'center',
    },
    retryButton: {
      minWidth: 160,
    },
    addressSection: {
      marginTop: 32,
    },
    addressLabel: {
      ...typography.subheading,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    addressValue: {
      ...typography.body,
      ...typography.monospace,
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 24,
    },
    copyButton: {
      alignSelf: 'stretch',
    },
  });

const ReceiveScreen: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const { layout, typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const fetchAddress = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAddress();
      setAddress(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load address.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddress().catch(err => {
      console.error('Failed to load receive address:', err);
    });
  }, [fetchAddress]);

  const handleCopyAddress = useCallback(async () => {
    if (!address) {
      return;
    }

    try {
      await Clipboard.setStringAsync(address);
      showToast('Address copied to clipboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to copy address.';
      showToast(message);
    }
  }, [address]);

  return (
    <SafeAreaView style={[layout.screen, styles.safeArea]}>
      <View style={styles.container}>
        <Text style={styles.title}>Receive Bitcoin</Text>
        <Text style={styles.subtitle}>Share this address or QR code to receive BTC payments.</Text>

        <View style={styles.qrWrapper}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Button label="Try Again" onPress={fetchAddress} style={styles.retryButton} />
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(600)}>
              <QRCode value={address ?? ''} />
            </Animated.View>
          )}
        </View>

        {address ? (
          <View style={styles.addressSection}>
            <Text style={styles.addressLabel}>Your BTC Address</Text>
            <Text style={styles.addressValue} selectable>{address}</Text>
            <Button label="Copy Address" onPress={handleCopyAddress} fullWidth style={styles.copyButton} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default ReceiveScreen;
