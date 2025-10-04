
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
import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles, TypographyStyles } from '../theme/styles';
import type { ThemeColors } from '../theme/colors';
import { getTransactions, Transaction } from '../services/api';
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const { layout, typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const loadTransactions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load transactions.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions().catch(err => {
      console.error('Failed to load transactions:', err);
    });
  }, [loadTransactions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to refresh transactions.';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => <TransactionItem transaction={item} />,
    []
  );

  const keyExtractor = useCallback((item: Transaction) => item.txId ?? item.id, []);

  return (
    <SafeAreaView style={[layout.screen, styles.safeArea]}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>Track recent payments and transfers across your wallet.</Text>
      </View>

      {loading ? (
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
