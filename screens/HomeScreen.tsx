
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { useBalance } from '../contexts/BalanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles, TypographyStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import { HomeStackParamList } from '../types/navigation';

const formatBTC = (amount: number): string => amount.toFixed(8);

const formatFiat = (amount: number, currency: string | null): string => {
  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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
    balanceLabel: {
      ...typography.subheading,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
    },
    balanceValue: {
      fontSize: 48,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    balanceFiat: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 8,
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
  const { balance, fiatBalance, fiatCurrency, pendingBalance, pendingFiatBalance, refreshBalance } = useBalance();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const { layout, typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  useFocusEffect(
    useCallback(() => {
      refreshBalance().catch(error => {
        console.error('Failed to refresh wallet balance:', error);
      });
    }, [refreshBalance])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBalance]);

  const handleNavigateToSend = useCallback(() => {
    navigation.navigate('Send');
  }, [navigation]);

  const handleNavigateToReceive = useCallback(() => {
    navigation.navigate('Receive');
  }, [navigation]);

  const formattedBTC = useMemo(() => formatBTC(balance), [balance]);
  const formattedFiat = useMemo(() => formatFiat(fiatBalance, fiatCurrency), [fiatBalance, fiatCurrency]);
  const formattedPendingBtc = useMemo(() => formatBTC(pendingBalance), [pendingBalance]);
  const formattedPendingFiat = useMemo(
    () => formatFiat(pendingFiatBalance, fiatCurrency),
    [pendingFiatBalance, fiatCurrency]
  );
  const hasPending = useMemo(
    () => Math.abs(pendingBalance) > 0 || Math.abs(pendingFiatBalance) > 0,
    [pendingBalance, pendingFiatBalance]
  );

  return (
    <SafeAreaView style={[layout.screen, styles.safeArea]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceValue}>{formattedBTC} BTC</Text>
          <Text style={styles.balanceFiat}>{formattedFiat}</Text>
          {hasPending ? (
            <Text style={styles.balanceFiat}>
              Pending: {formattedPendingBtc} BTC · {formattedPendingFiat}
            </Text>
          ) : null}
        </Animated.View>

        <View style={styles.actionsContainer}>
          <Button label="Send" onPress={handleNavigateToSend} fullWidth style={[styles.actionButton, styles.firstAction]} />
          <Button label="Receive" onPress={handleNavigateToReceive} fullWidth style={styles.actionButton} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
