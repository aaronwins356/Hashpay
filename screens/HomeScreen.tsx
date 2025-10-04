
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useBalance } from '../contexts/BalanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles, TypographyStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import { HomeStackParamList } from '../types/navigation';

const formatBTC = (amount: number): string => amount.toFixed(8);

const formatUSD = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const createStyles = (colors: ThemeColors, typography: TypographyStyles) =>
  StyleSheet.create({
    safeArea: {
      paddingTop: 32,
    },
    contentContainer: {
      flexGrow: 1,
      justifyContent: 'space-between',
      paddingBottom: 48,
    },
    balanceContainer: {
      marginTop: 24,
    },
    totalLabel: {
      ...typography.subheading,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    totalValue: {
      fontSize: 40,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    totalSecondary: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 6,
    },
    balancesGrid: {
      marginTop: 24,
      flexDirection: 'row',
      gap: 16,
    },
    balanceCard: {
      flex: 1,
    },
    cardTitle: {
      ...typography.subheading,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    cardAmount: {
      ...typography.heading,
      fontSize: 24,
    },
    cardSecondary: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 4,
    },
    rateText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 12,
    },
    actionsContainer: {
      marginTop: 48,
    },
    actionButton: {
      height: 64,
      borderRadius: 18,
    },
    firstAction: {
      marginBottom: 16,
    },
  });

const HomeScreen: React.FC = () => {
  const { balances, rates, refreshBalances, balancesReady } = useBalance();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const { layout, typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  useFocusEffect(
    useCallback(() => {
      refreshBalances().catch(error => {
        console.error('Failed to refresh wallet balance:', error);
      });
    }, [refreshBalances])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBalances();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBalances]);

  const handleNavigateToSend = useCallback(() => {
    navigation.navigate('Send');
  }, [navigation]);

  const handleNavigateToReceive = useCallback(() => {
    navigation.navigate('Receive');
  }, [navigation]);

  const handleNavigateToConvert = useCallback(() => {
    navigation.navigate('Convert');
  }, [navigation]);

  const btcBalance = balances.btc.balance;
  const btcPending = balances.btc.pending;
  const usdBalance = balances.usd.balance;
  const usdPending = balances.usd.pending;

  const totalUsdValue = useMemo(
    () => usdBalance + btcBalance * rates.usdPerBtc,
    [btcBalance, rates.usdPerBtc, usdBalance]
  );

  const totalBtcValue = useMemo(() => {
    if (rates.usdPerBtc <= 0) {
      return btcBalance;
    }
    return btcBalance + usdBalance / rates.usdPerBtc;
  }, [btcBalance, rates.usdPerBtc, usdBalance]);

  return (
    <SafeAreaView style={[layout.screen, styles.safeArea]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.balanceContainer}>
          <Text style={styles.totalLabel}>Total Wallet Value</Text>
          <Text style={styles.totalValue}>{formatUSD(totalUsdValue)}</Text>
          <Text style={styles.totalSecondary}>{formatBTC(totalBtcValue)} BTC</Text>
          <Text style={styles.rateText}>
            {balancesReady && rates.usdPerBtc > 0 ? `1 BTC ≈ ${formatUSD(rates.usdPerBtc)}` : 'Updating market rate…'}
          </Text>
        </Animated.View>

        <View style={styles.balancesGrid}>
          <Card style={styles.balanceCard}>
            <Text style={styles.cardTitle}>Bitcoin</Text>
            <Text style={styles.cardAmount}>{formatBTC(btcBalance)} BTC</Text>
            <Text style={styles.cardSecondary}>Pending: {formatBTC(btcPending)} BTC</Text>
            <Text style={styles.cardSecondary}>{formatUSD(btcBalance * rates.usdPerBtc)}</Text>
          </Card>
          <Card style={styles.balanceCard}>
            <Text style={styles.cardTitle}>US Dollar</Text>
            <Text style={styles.cardAmount}>{formatUSD(usdBalance)}</Text>
            <Text style={styles.cardSecondary}>Pending: {formatUSD(usdPending)}</Text>
            <Text style={styles.cardSecondary}>
              ≈ {rates.usdPerBtc > 0 ? formatBTC(usdBalance / rates.usdPerBtc) : '—'} BTC
            </Text>
          </Card>
        </View>

        <View style={styles.actionsContainer}>
          <Button label="Send" onPress={handleNavigateToSend} fullWidth style={[styles.actionButton, styles.firstAction]} />
          <Button label="Receive" onPress={handleNavigateToReceive} fullWidth style={styles.actionButton} />
          <Button label="Convert" onPress={handleNavigateToConvert} fullWidth style={styles.actionButton} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
