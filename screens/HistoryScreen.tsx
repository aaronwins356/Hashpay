
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles, TypographyStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import { useBalance } from '../contexts/BalanceContext';
import type { Transaction } from '../services/api';
import { TransactionItem } from '../components/TransactionItem';

const createStyles = (colors: ThemeColors, typography: TypographyStyles) =>
  StyleSheet.create({
    safeArea: {
      paddingTop: 32,
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
    listContent: {
      paddingBottom: 48,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      marginTop: 64,
      alignItems: 'center',
    },
    emptyTitle: {
      ...typography.subheading,
      color: colors.textSecondary,
      marginTop: 12,
      textAlign: 'center',
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
      marginTop: 24,
    },
  });

const HistoryScreen: React.FC = () => {
  const { transactions, refreshTransactions, transactionsReady } = useBalance();
  const [loading, setLoading] = useState(!transactionsReady);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const { layout, typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      await refreshTransactions();
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load transactions.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [refreshTransactions]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions().catch(err => {
        console.error('Failed to load transactions:', err);
      });
    }, [loadTransactions])
  );

  useEffect(() => {
    if (transactionsReady) {
      setLoading(false);
    }
  }, [transactionsReady]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshTransactions();
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to refresh transactions.';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshTransactions]);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => <TransactionItem transaction={item} />,
    []
  );

  const keyExtractor = useCallback((item: Transaction) => item.txId ?? item.id, []);

  const isLoading = loading || !transactionsReady;

  return (
    <SafeAreaView style={[layout.screen, styles.safeArea]}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>Track recent payments and transfers across your wallet.</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, transactions.length === 0 && styles.emptyState]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No transactions yet. Start transacting to see history.</Text>
              </View>
            ) : null
          }
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </SafeAreaView>
  );
};

export default HistoryScreen;
