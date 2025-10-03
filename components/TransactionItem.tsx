
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles, TypographyStyles } from '../theme/styles';
import type { Transaction } from '../services/api';

interface TransactionItemProps {
  transaction: Transaction;
}

const STATUS_LABEL: Record<Transaction['status'], string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  failed: 'Failed',
};

const getStatusColor = (status: Transaction['status'], colors: ThemeColors): string => {
  switch (status) {
    case 'confirmed':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'failed':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const createStyles = (colors: ThemeColors, typography: TypographyStyles) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    amount: {
      ...typography.heading,
      fontSize: 22,
    },
    status: {
      ...typography.subheading,
      fontSize: 14,
      textTransform: 'uppercase',
    },
    meta: {
      marginTop: 4,
    },
    metaLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    metaValue: {
      ...typography.monospace,
      fontSize: 13,
    },
  });

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const { colors } = useTheme();
  const { typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const statusColor = getStatusColor(transaction.status, colors);

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.amount}>{transaction.amount.toFixed(8)} BTC</Text>
          <Text style={[styles.status, { color: statusColor }]}>{STATUS_LABEL[transaction.status]}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Date</Text>
          <Text style={styles.metaValue}>{formatDate(transaction.date)}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Transaction ID</Text>
          <Text style={styles.metaValue} selectable numberOfLines={1} ellipsizeMode="middle">
            {transaction.txid}
          </Text>
        </View>
      </Card>
    </View>
  );
};

export default TransactionItem;
