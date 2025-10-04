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

const getStatusBackground = (status: Transaction['status'], colors: ThemeColors): string => {
  switch (status) {
    case 'confirmed':
      return `${colors.success}20`;
    case 'pending':
      return `${colors.warning}20`;
    case 'failed':
      return `${colors.error}20`;
    default:
      return `${colors.border}`;
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

const formatUSD = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatBTC = (amount: number): string => amount.toFixed(8);

const createStyles = (colors: ThemeColors, typography: TypographyStyles) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    amount: {
      ...typography.heading,
      fontSize: 22,
    },
    direction: {
      ...typography.caption,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    detail: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 4,
    },
    statusBadge: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
    },
    statusText: {
      ...typography.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    metaRow: {
      marginTop: 10,
    },
    metaLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    metaValue: {
      ...typography.monospace,
      fontSize: 13,
      color: colors.textPrimary,
    },
  });

const formatPrimaryAmount = (transaction: Transaction): string => {
  const sign = transaction.direction === 'inbound' ? '+' : '-';
  if (transaction.currency === 'USD') {
    return `${sign}${formatUSD(transaction.primaryAmount)}`;
  }
  return `${sign}${formatBTC(transaction.primaryAmount)} BTC`;
};

const buildDetailLines = (transaction: Transaction): string[] => {
  const sign = transaction.direction === 'inbound' ? '+' : '-';
  const lines: string[] = [];

  if (transaction.currency === 'BTC' && transaction.amountUsd != null) {
    lines.push(`${sign}${formatUSD(transaction.amountUsd)}`);
  } else if (transaction.currency === 'USD' && transaction.amountBtc != null) {
    lines.push(`${sign}${formatBTC(transaction.amountBtc)} BTC`);
  }

  if (transaction.sourceCurrency && transaction.sourceCurrency !== transaction.currency && transaction.requestedAmount != null) {
    const formattedSource = transaction.sourceCurrency === 'USD'
      ? formatUSD(transaction.requestedAmount)
      : `${formatBTC(transaction.requestedAmount)} BTC`;
    lines.push(`From ${formattedSource}`);
  }

  return lines;
};

const formatFeeDetail = (transaction: Transaction): string | null => {
  const { fee } = transaction;
  if (fee.amount == null && fee.usd == null) {
    return null;
  }

  if (fee.currency === 'USD') {
    return formatUSD(fee.amount ?? fee.usd ?? 0);
  }

  if (fee.currency === 'BTC') {
    const btcValue = fee.amount ?? 0;
    const usdValue = fee.usd;
    return usdValue != null ? `${formatBTC(btcValue)} BTC (${formatUSD(usdValue)})` : `${formatBTC(btcValue)} BTC`;
  }

  if (fee.usd != null) {
    return formatUSD(fee.usd);
  }

  return null;
};

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const { colors } = useTheme();
  const { typography } = useThemedStyles();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const primaryAmount = useMemo(() => formatPrimaryAmount(transaction), [transaction]);
  const detailLines = useMemo(() => buildDetailLines(transaction), [transaction]);
  const feeDetail = useMemo(() => formatFeeDetail(transaction), [transaction]);

  const statusColor = getStatusColor(transaction.status, colors);
  const statusBackground = getStatusBackground(transaction.status, colors);
  const directionLabel = transaction.direction === 'inbound' ? 'Inbound' : 'Outbound';

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.header}>
          <View>
            <Text style={styles.amount}>{primaryAmount}</Text>
            <Text style={styles.direction}>
              {directionLabel} · {transaction.currency}
            </Text>
            {detailLines.map(line => (
              <Text key={line} style={styles.detail}>
                {line}
              </Text>
            ))}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBackground }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[transaction.status]}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date</Text>
          <Text style={styles.metaValue}>{formatDate(transaction.createdAt)}</Text>
        </View>

        {transaction.counterparty ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Counterparty</Text>
            <Text style={styles.metaValue}>{transaction.counterparty}</Text>
          </View>
        ) : null}

        {feeDetail ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Fee</Text>
            <Text style={styles.metaValue}>{feeDetail}</Text>
          </View>
        ) : null}

        {transaction.confirmations != null ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Confirmations</Text>
            <Text style={styles.metaValue}>{transaction.confirmations}</Text>
          </View>
        ) : null}

        {transaction.txId ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Transaction ID</Text>
            <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="middle" selectable>
              {transaction.txId}
            </Text>
          </View>
        ) : null}

        {transaction.description ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Notes</Text>
            <Text style={styles.metaValue}>{transaction.description}</Text>
          </View>
        ) : null}
      </Card>
    </View>
  );
};

export default TransactionItem;

