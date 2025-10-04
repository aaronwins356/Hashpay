import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useBalance } from '../contexts/BalanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles, TypographyStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import {
  executeConversion,
  getConversionQuote,
  type ConversionQuote,
} from '../services/api';
import { HomeStackParamList } from '../types/navigation';

const formatUSD = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatBTC = (amount: number): string => amount.toFixed(8);

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
    contentContainer: {
      flexGrow: 1,
      paddingBottom: 48,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      ...typography.heading,
      marginBottom: 8,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    toggleGroup: {
      flexDirection: 'row',
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    toggleOption: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    toggleOptionActive: {
      backgroundColor: colors.accent,
    },
    toggleLabel: {
      ...typography.subheading,
      color: colors.textSecondary,
    },
    toggleLabelActive: {
      color: colors.background,
    },
    formSection: {
      marginBottom: 24,
    },
    field: {
      marginBottom: 16,
    },
    summaryCard: {
      marginBottom: 24,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    summaryLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    summaryValue: {
      ...typography.body,
      fontWeight: '600',
    },
    summaryTotal: {
      ...typography.subheading,
      fontWeight: '700',
    },
    helperText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    errorText: {
      ...typography.caption,
      color: colors.error,
      marginTop: 8,
    },
    rateText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 12,
    },
    buttonWrapper: {
      marginTop: 24,
    },
  });

const sanitizeAmount = (value: string, decimals: number): string => {
  const trimmed = value.replace(/[^0-9.]/g, '');
  if (!trimmed) {
    return '';
  }

  const [whole, ...decimalParts] = trimmed.split('.');
  const decimal = decimalParts.join('').slice(0, decimals);
  return decimalParts.length > 0 ? `${whole}.${decimal}` : whole;
};

const ConvertScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { refreshBalances, refreshTransactions, rates } = useBalance();
  const { colors } = useTheme();
  const { layout, typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [fromCurrency, setFromCurrency] = useState<'USD' | 'BTC'>('USD');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<ConversionQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const targetCurrency = fromCurrency === 'USD' ? 'BTC' : 'USD';

  const amountValue = useMemo(() => {
    const parsed = Number.parseFloat(amount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const handleChangeCurrency = useCallback(
    (next: 'USD' | 'BTC') => {
      if (next === fromCurrency) {
        return;
      }
      setFromCurrency(next);
      setAmount('');
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
    },
    [fromCurrency]
  );

  const handleAmountChange = useCallback(
    (value: string) => {
      const decimals = fromCurrency === 'USD' ? 2 : 8;
      setAmount(sanitizeAmount(value, decimals));
    },
    [fromCurrency]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!amount) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    let cancelled = false;

    debounceRef.current = setTimeout(() => {
      getConversionQuote(fromCurrency, parsed)
        .then(result => {
          if (!cancelled) {
            setQuote(result);
          }
        })
        .catch(error => {
          if (!cancelled) {
            setQuote(null);
            const message = error instanceof Error ? error.message : 'Unable to fetch conversion quote.';
            setQuoteError(message);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setQuoteLoading(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [amount, fromCurrency]);

  const handleSubmit = useCallback(async () => {
    if (!quote || amountValue <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await executeConversion(fromCurrency, amountValue);
      showToast('Conversion completed');
      setAmount('');
      setQuote(null);
      setQuoteError(null);
      await Promise.all([
        refreshBalances({ silent: true }),
        refreshTransactions({ silent: true }),
      ]);
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process conversion.';
      showToast(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [amountValue, fromCurrency, navigation, quote, refreshBalances, refreshTransactions]);

  const feeAmountNumber = useMemo(() => {
    if (!quote) {
      return 0;
    }
    const parsed = Number.parseFloat(quote.feeAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [quote]);

  const conversionRateText = useMemo(() => {
    if (!quote) {
      return rates.usdPerBtc > 0
        ? `Market rate: ${formatUSD(rates.usdPerBtc)} per BTC`
        : 'Awaiting conversion quote…';
    }
    return `Quote locked at ${formatUSD(quote.rate.raw)} per BTC`;
  }, [quote, rates.usdPerBtc]);

  const feeDisplay = useMemo(() => {
    if (!quote) {
      return null;
    }

    if (fromCurrency === 'USD') {
      const impliedBtc = quote.rate.raw > 0 ? quote.feeUsd / quote.rate.raw : 0;
      return `${formatUSD(feeAmountNumber)} (${formatBTC(impliedBtc)} BTC)`;
    }

    return `${formatBTC(feeAmountNumber)} BTC (${formatUSD(quote.feeUsd)})`;
  }, [feeAmountNumber, fromCurrency, quote]);

  const receiveDisplay = useMemo(() => {
    if (!quote) {
      return null;
    }

    return targetCurrency === 'USD' ? formatUSD(quote.convertedAmount) : `${formatBTC(quote.convertedAmount)} BTC`;
  }, [quote, targetCurrency]);

  const sendDisplay = useMemo(() => {
    if (!quote) {
      return null;
    }

    return fromCurrency === 'USD' ? formatUSD(quote.requestedAmount) : `${formatBTC(quote.requestedAmount)} BTC`;
  }, [fromCurrency, quote]);

  const effectiveRate = useMemo(() => {
    if (!quote) {
      return rates.usdPerBtc > 0 ? `Market rate: ${formatUSD(rates.usdPerBtc)}` : 'Rate unavailable';
    }
    return `Effective rate: ${formatUSD(quote.rate.final)} per BTC`;
  }, [quote, rates.usdPerBtc]);

  const isSubmitDisabled = amountValue <= 0 || !quote || quoteLoading || isSubmitting || Boolean(quoteError);

  return (
    <SafeAreaView style={[layout.screen, styles.safeArea]}>
      <KeyboardAvoidingView
        style={layout.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView contentContainerStyle={[styles.contentContainer]} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Convert Funds</Text>
            <Text style={styles.subtitle}>Move between USD and BTC instantly with transparent fees.</Text>
          </View>

          <View style={styles.toggleGroup}>
            <Pressable
              style={[styles.toggleOption, fromCurrency === 'USD' && styles.toggleOptionActive]}
              onPress={() => handleChangeCurrency('USD')}
            >
              <Text style={[styles.toggleLabel, fromCurrency === 'USD' && styles.toggleLabelActive]}>USD → BTC</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleOption, fromCurrency === 'BTC' && styles.toggleOptionActive]}
              onPress={() => handleChangeCurrency('BTC')}
            >
              <Text style={[styles.toggleLabel, fromCurrency === 'BTC' && styles.toggleLabelActive]}>BTC → USD</Text>
            </Pressable>
          </View>

          <View style={styles.formSection}>
            <Input
              label={`Amount (${fromCurrency})`}
              placeholder={fromCurrency === 'USD' ? '0.00' : '0.00000000'}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              containerStyle={styles.field}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>{conversionRateText}</Text>
            {quoteError ? <Text style={styles.errorText}>{quoteError}</Text> : null}
          </View>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>You Send</Text>
              <Text style={styles.summaryValue}>{sendDisplay ?? '—'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Conversion Fee</Text>
              <Text style={styles.summaryValue}>{feeDisplay ?? '—'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>You Receive</Text>
              <Text style={styles.summaryTotal}>{receiveDisplay ?? '—'}</Text>
            </View>
            <Text style={styles.rateText}>{effectiveRate}</Text>
          </Card>

          <View style={styles.buttonWrapper}>
            <Button
              label={quoteLoading ? 'Fetching quote…' : isSubmitting ? 'Converting…' : 'Convert Now'}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              loading={isSubmitting}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ConvertScreen;

