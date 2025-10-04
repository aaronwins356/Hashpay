import React from 'react';
import { render } from '@testing-library/react-native';
import { TransactionItem } from '../components/TransactionItem';
import { ThemeProvider } from '../contexts/ThemeContext';
import type { Transaction } from '../services/api';

const renderWithProviders = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('TransactionItem', () => {
  it('renders inbound BTC transaction with fiat detail', () => {
    const transaction: Transaction = {
      id: 'tx-1',
      currency: 'BTC',
      primaryAmount: 0.01,
      amountBtc: 0.01,
      amountUsd: 200,
      convertedAmountBtc: null,
      convertedAmountUsd: null,
      direction: 'inbound',
      status: 'confirmed',
      confirmations: 2,
      txId: 'hash-1',
      createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
      description: 'Inbound payment',
      fee: { amount: 0.0002, currency: 'BTC', usd: 8 },
      counterparty: 'bc1qtest',
      usdPerBtc: 20000,
      sourceCurrency: null,
      requestedAmount: null,
    };

    const { getByText } = renderWithProviders(<TransactionItem transaction={transaction} />);

    expect(getByText('+0.01000000 BTC')).toBeTruthy();
    expect(getByText('+$200.00')).toBeTruthy();
    expect(getByText('Fee')).toBeTruthy();
    expect(getByText('Inbound · BTC')).toBeTruthy();
  });

  it('renders conversion details for USD to BTC', () => {
    const transaction: Transaction = {
      id: 'tx-2',
      currency: 'BTC',
      primaryAmount: 0.005,
      amountBtc: 0.005,
      amountUsd: null,
      convertedAmountBtc: 0.005,
      convertedAmountUsd: null,
      direction: 'inbound',
      status: 'pending',
      confirmations: null,
      txId: null,
      createdAt: new Date('2024-02-02T00:00:00Z').toISOString(),
      description: 'USD to BTC conversion',
      fee: { amount: 5, currency: 'USD', usd: 5 },
      counterparty: null,
      usdPerBtc: 40000,
      sourceCurrency: 'USD',
      requestedAmount: 250,
    };

    const { getByText } = renderWithProviders(<TransactionItem transaction={transaction} />);

    expect(getByText('+0.00500000 BTC')).toBeTruthy();
    expect(getByText('From $250.00')).toBeTruthy();
    expect(getByText('Convert USD to BTC')).toBeTruthy();
  });
});

