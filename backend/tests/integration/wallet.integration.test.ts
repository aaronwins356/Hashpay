import { describe, it, expect } from '../utils/harness';
import { setupIntegrationServices } from '../helpers/integration';
import { insertUser } from '../helpers/seeds';

const parseNumeric = (value: string | null | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const shouldSkip = (error: unknown): boolean => {
  return error instanceof Error && error.message.includes('pg-mem module is required');
};

describe('WalletService integration', () => {
  it('returns balances with BTC and USD snapshots', async () => {
    let services;
    try {
      services = await setupIntegrationServices();
    } catch (error) {
      if (shouldSkip(error)) {
        console.warn('Skipping integration tests: pg-mem unavailable.');
        return;
      }
      throw error;
    }
    const { pool, cleanup, WalletService, WalletRepository, conversionService } = services;

    try {
      conversionService.setManualRate(30000);
      const userId = await insertUser(pool, 'balance@test.local');

      const btcWallet = await WalletRepository.createWallet(userId, 'BTC');
      const usdWallet = await WalletRepository.createWallet(userId, 'USD');

      await pool.query(`UPDATE wallets SET balance = '0.5', pending_balance = '0.1' WHERE id = $1`, [btcWallet.id]);
      await pool.query(`UPDATE wallets SET balance = '2500', pending_balance = '75' WHERE id = $1`, [usdWallet.id]);

      const snapshot = await WalletService.getBalances(userId);
      expect(snapshot.balances.BTC.balance).toBeCloseTo(0.5, 8);
      expect(snapshot.balances.BTC.pending).toBeCloseTo(0.1, 8);
      expect(snapshot.balances.USD.balance).toBeCloseTo(2500, 2);
      expect(snapshot.balances.USD.pending).toBeCloseTo(75, 2);
      expect(snapshot.usdPerBtc).toBeCloseTo(30000, 2);
    } finally {
      await cleanup();
    }
  });

  it('sends BTC and records transaction and ledger entries', async () => {
    let services;
    try {
      services = await setupIntegrationServices();
    } catch (error) {
      if (shouldSkip(error)) {
        console.warn('Skipping integration tests: pg-mem unavailable.');
        return;
      }
      throw error;
    }
    const { pool, cleanup, WalletService, WalletRepository, TransactionRepository, conversionService, bitcoinService } = services;

    try {
      conversionService.setManualRate(20000);
      bitcoinService.sendToAddress = async () => 'tx-test-1';

      const userId = await insertUser(pool, 'send@test.local');
      const btcWallet = await WalletRepository.createWallet(userId, 'BTC');

      await pool.query(`UPDATE wallets SET balance = '0.05' WHERE id = $1`, [btcWallet.id]);

      const result = await WalletService.sendBitcoin(userId, 'bc1qdestination', 0.01);
      expect(result.txId).toBe('tx-test-1');

      const refreshedWallet = await WalletRepository.findByUserAndCurrency(userId, 'BTC');
      const remaining = parseNumeric(refreshedWallet?.balance);
      expect(remaining).toBeLessThan(0.05);

      const transactions = await TransactionRepository.list({ userId, limit: 10, offset: 0 });
      expect(transactions.length).toBe(1);
      expect(transactions[0].type).toBe('withdrawal');
      expect(parseNumeric(transactions[0].feeAmount)).toBeGreaterThan(0);

      const ledgerEntries = await pool.query(
        `SELECT transaction_id, direction, amount::text AS amount FROM ledger_entries`
      );
      expect(ledgerEntries.rowCount).toBe(1);
      expect(ledgerEntries.rows[0].direction).toBe('debit');
    } finally {
      await cleanup();
    }
  });

  it('records bitcoin deposits with pending and confirmation flow', async () => {
    let services;
    try {
      services = await setupIntegrationServices();
    } catch (error) {
      if (shouldSkip(error)) {
        console.warn('Skipping integration tests: pg-mem unavailable.');
        return;
      }
      throw error;
    }
    const { pool, cleanup, WalletService, WalletRepository, conversionService } = services;

    try {
      conversionService.setManualRate(25000);
      const userId = await insertUser(pool, 'deposit@test.local');
      await WalletRepository.createWallet(userId, 'BTC');

      await WalletService.recordBitcoinDeposit({
        userId,
        amountBtc: 0.02,
        txHash: 'hash-1',
        confirmations: 0,
      });

      let btcWallet = await WalletRepository.findByUserAndCurrency(userId, 'BTC');
      expect(parseNumeric(btcWallet?.pendingBalance)).toBeGreaterThan(0);
      expect(parseNumeric(btcWallet?.balance)).toBeCloseTo(0, 8);

      await WalletService.recordBitcoinDeposit({
        userId,
        amountBtc: 0.02,
        txHash: 'hash-1',
        confirmations: 2,
      });

      btcWallet = await WalletRepository.findByUserAndCurrency(userId, 'BTC');
      expect(parseNumeric(btcWallet?.pendingBalance)).toBeCloseTo(0, 8);
      expect(parseNumeric(btcWallet?.balance)).toBeGreaterThan(0);
    } finally {
      await cleanup();
    }
  });

  it('converts balances between USD and BTC', async () => {
    let services;
    try {
      services = await setupIntegrationServices();
    } catch (error) {
      if (shouldSkip(error)) {
        console.warn('Skipping integration tests: pg-mem unavailable.');
        return;
      }
      throw error;
    }
    const { pool, cleanup, WalletService, WalletRepository, conversionService } = services;

    try {
      conversionService.setManualRate(40000);
      const userId = await insertUser(pool, 'convert@test.local');
      const btcWallet = await WalletRepository.createWallet(userId, 'BTC');
      const usdWallet = await WalletRepository.createWallet(userId, 'USD');

      await pool.query(`UPDATE wallets SET balance = '1000' WHERE id = $1`, [usdWallet.id]);

      const usdToBtc = await WalletService.convert(userId, 'USD', 200);
      expect(usdToBtc.direction).toBe('USD_TO_BTC');
      expect(usdToBtc.convertedAmount).toBeGreaterThan(0);

      let refreshedUsd = await WalletRepository.findByUserAndCurrency(userId, 'USD');
      let refreshedBtc = await WalletRepository.findByUserAndCurrency(userId, 'BTC');
      expect(parseNumeric(refreshedUsd?.balance)).toBeLessThan(1000);
      expect(parseNumeric(refreshedBtc?.balance)).toBeGreaterThan(0);

      await pool.query(`UPDATE wallets SET balance = '0.05' WHERE id = $1`, [btcWallet.id]);

      const btcToUsd = await WalletService.convert(userId, 'BTC', 0.01);
      expect(btcToUsd.direction).toBe('BTC_TO_USD');
      expect(btcToUsd.convertedAmount).toBeGreaterThan(0);

      refreshedUsd = await WalletRepository.findByUserAndCurrency(userId, 'USD');
      refreshedBtc = await WalletRepository.findByUserAndCurrency(userId, 'BTC');
      expect(parseNumeric(refreshedUsd?.balance)).toBeGreaterThan(0);
      expect(parseNumeric(refreshedBtc?.balance)).toBeLessThan(0.05);
    } finally {
      await cleanup();
    }
  });
});

