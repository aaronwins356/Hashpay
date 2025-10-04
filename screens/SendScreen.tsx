
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useBalance } from '../contexts/BalanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles, TypographyStyles, LayoutStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import { HomeStackParamList } from '../types/navigation';

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('HASH', message);
  }
};

const formatBTC = (value: number): string => value.toFixed(8);
const formatUSD = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const createStyles = (colors: ThemeColors, typography: TypographyStyles, layout: LayoutStyles) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      paddingTop: 32,
    },
    flex: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      paddingBottom: 48,
    },
    headerSection: {
      marginBottom: 24,
    },
    title: {
      ...typography.heading,
      marginBottom: 8,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 4,
    },
    formSection: {
      marginBottom: 24,
    },
    field: {
      marginBottom: 16,
    },
    scanButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 28,
      marginBottom: 16,
    },
    feesContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      marginBottom: 32,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    feeLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    feeValue: {
      ...typography.body,
      fontWeight: '600',
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginTop: 8,
      marginBottom: 0,
    },
    totalLabel: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    totalValue: {
      ...typography.subheading,
      fontWeight: '700',
    },
    helperText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
    },
    availabilityText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    buttonWrapper: {
      marginTop: 16,
    },
    ripple: {
      position: 'absolute',
      width: 600,
      height: 600,
      borderRadius: 300,
      backgroundColor: colors.accent,
      alignSelf: 'center',
      top: -200,
    },
    scannerOverlay: {
      flex: 1,
      backgroundColor: colors.modalBackdrop,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    scannerCard: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scannerTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
    },
    scannerFrame: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.accent,
      alignSelf: 'center',
      marginBottom: 16,
    },
    permissionText: {
      ...typography.caption,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 16,
    },
    scannerButton: {
      marginTop: 8,
    },
  });

const SendScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { sendBTC, balances, rates } = useBalance();
  const { colors } = useTheme();
  const { layout, typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography, layout), [colors, typography, layout]);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const rippleScale = useSharedValue(0);

  const triggerRipple = useCallback(() => {
    rippleScale.value = 0.001;
    rippleScale.value = withSequence(
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 520, easing: Easing.in(Easing.cubic) })
    );
  }, [rippleScale]);

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleScale.value === 0 ? 0 : 0.22,
  }));

  const amountValue = useMemo(() => {
    const parsed = Number.parseFloat(amount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const usdPerBtc = rates.usdPerBtc;

  const feeSummary = useMemo(() => {
    if (amountValue <= 0) {
      return { feeUsd: 0, feeBtc: null, totalBtc: null };
    }

    const usdValue = usdPerBtc > 0 ? amountValue * usdPerBtc : 0;
    const feeUsd = Math.max(usdValue * 0.02, 1.45);
    const feeBtc = usdPerBtc > 0 ? feeUsd / usdPerBtc : null;
    const totalBtc = feeBtc != null ? feeBtc + amountValue : null;
    return {
      feeUsd,
      feeBtc,
      totalBtc,
    };
  }, [amountValue, usdPerBtc]);

  const handleAmountChange = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    if (!sanitized) {
      setAmount('');
      return;
    }

    const [wholePart, ...decimalParts] = sanitized.split('.');
    const decimal = decimalParts.join('').slice(0, 8);
    const nextValue = decimalParts.length > 0 ? `${wholePart}.${decimal}` : wholePart;
    setAmount(nextValue);
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (hasCameraPermission === true) {
      return true;
    }

    const { status } = await BarCodeScanner.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasCameraPermission(granted);

    if (!granted) {
      showToast('Camera permission is required to scan QR codes.');
    }

    return granted;
  }, [hasCameraPermission]);

  const handleScanPress = useCallback(async () => {
    const granted = await requestCameraPermission();
    if (granted) {
      setIsScannerVisible(true);
    }
  }, [requestCameraPermission]);

  const handleBarCodeScanned = useCallback(
    (event: BarCodeScannerResult) => {
      setIsScannerVisible(false);
      if (event?.data) {
        setRecipient(event.data.trim());
        showToast('Address scanned');
      }
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    const trimmedAddress = recipient.trim();

    if (!trimmedAddress || amountValue <= 0) {
      showToast('Enter a valid address and amount to continue.');
      return;
    }

    try {
      triggerRipple();
      setIsSubmitting(true);
      await sendBTC(trimmedAddress, amountValue);
      showToast('Transaction Sent!');
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send BTC.';
      showToast(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [amountValue, navigation, recipient, sendBTC, triggerRipple]);

  const isConfirmDisabled = !recipient.trim() || amountValue <= 0 || isSubmitting;

  return (
    <View style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.ripple, rippleStyle]} />
      <SafeAreaView style={[layout.screen, styles.safeArea]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.headerSection}>
              <Text style={styles.title}>Send Bitcoin</Text>
              <Text style={styles.subtitle}>
                Review the details carefully before confirming your transfer.
              </Text>
            </View>

            <View style={styles.formSection}>
              <Input
                label="Recipient Address"
                placeholder="bc1..."
                autoCapitalize="none"
                autoCorrect={false}
                value={recipient}
                onChangeText={setRecipient}
                containerStyle={styles.field}
              />

              <Button label="Scan QR" onPress={handleScanPress} style={styles.scanButton} />

              <Input
                label="Amount (BTC)"
                placeholder="0.00000000"
                value={amount}
                onChangeText={handleAmountChange}
                numeric
                keyboardType="decimal-pad"
                containerStyle={styles.field}
              />
              <Text style={styles.availabilityText}>
                Available: {formatBTC(balances.btc.balance)} BTC
                {usdPerBtc > 0 ? ` (${formatUSD(balances.btc.balance * usdPerBtc)})` : ''}
              </Text>
            </View>

            <View style={styles.feesContainer}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Amount</Text>
                <Text style={styles.feeValue}>{formatBTC(amountValue)} BTC</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Transfer Fee</Text>
                <Text style={styles.feeValue}>
                  {amountValue > 0
                    ? feeSummary.feeBtc != null
                      ? `${formatBTC(feeSummary.feeBtc)} BTC (${formatUSD(feeSummary.feeUsd)})`
                      : formatUSD(feeSummary.feeUsd)
                    : '—'}
                </Text>
              </View>
              <View style={[styles.feeRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Debit</Text>
                <Text style={styles.totalValue}>
                  {amountValue > 0
                    ? feeSummary.totalBtc != null
                      ? `${formatBTC(feeSummary.totalBtc)} BTC`
                      : 'Pending rate…'
                    : '—'}
                </Text>
              </View>
              <Text style={styles.helperText}>Includes a 2% fee (minimum $1.45 USD).</Text>
            </View>

            <View style={styles.buttonWrapper}>
              <Button
                label={isSubmitting ? 'Sending...' : 'Confirm Transfer'}
                onPress={handleConfirm}
                disabled={isConfirmDisabled}
                loading={isSubmitting}
                fullWidth
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <RNModal visible={isScannerVisible} animationType="fade" transparent onRequestClose={() => setIsScannerVisible(false)}>
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerCard}>
            <Text style={styles.scannerTitle}>Scan recipient QR</Text>
            <View style={styles.scannerFrame}>
              <BarCodeScanner onBarCodeScanned={handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />
            </View>
            {hasCameraPermission === false ? (
              <Text style={styles.permissionText}>
                Enable camera permissions in settings to scan addresses.
              </Text>
            ) : null}
            <Button label="Cancel" onPress={() => setIsScannerVisible(false)} fullWidth style={styles.scannerButton} />
          </View>
        </View>
      </RNModal>
    </View>
  );
};

export default SendScreen;
