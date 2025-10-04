/* eslint-disable no-console */
import 'dotenv/config';
import config from '../../config';
import '../db';
import bitcoinService, { GetTransactionDetails, ListTransaction } from '../services/BitcoinService';
import TransactionRepository, {
  TransactionDirection,
  TransactionStatus
} from '../repositories/TransactionRepository';
import WalletRepository from '../repositories/WalletRepository';
import exchangeRateService, { ExchangeRateQuote } from '../services/ExchangeRateService';
import pool from '../db/db';

const SATS_PER_BTC = 100_000_000n;

const toSats = (amountBtc: number): bigint => BigInt(Math.round(amountBtc * Number(SATS_PER_BTC)));

const satsToBtc = (sats: string | bigint): number => {
  const value = typeof sats === 'bigint' ? sats : BigInt(sats);
  return Number(value) / Number(SATS_PER_BTC);
};

const computeFiatValue = (btc: number, quote: ExchangeRateQuote | null): number | null => {
  if (!quote) {
    return null;
  }

  return Math.round(btc * quote.rate * 100) / 100;
};

const resolveQuote = async (): Promise<ExchangeRateQuote | null> => {
  try {
    return await exchangeRateService.getLatestQuote();
  } catch (error) {
    console.warn('Watcher: failed to fetch exchange rate', error);
    return null;
  }
};

const processInboundTransaction = async (
  tx: GetTransactionDetails,
  quote: ExchangeRateQuote | null
): Promise<void> => {
  const { txid, confirmations, blocktime } = tx;
  const details = tx.details ?? [];
  const perUserAmounts = new Map<number, bigint>();

  await Promise.all(
    details
      .filter(detail => detail.category === 'receive' && Boolean(detail.address))
      .map(async detail => {
        if (!detail.address) {
          return;
        }

        const wallet = await WalletRepository.findByAddress(detail.address);
        if (!wallet) {
          return;
        }

        const amountSats = toSats(Math.abs(detail.amount));
        const current = perUserAmounts.get(wallet.userId) ?? 0n;
        perUserAmounts.set(wallet.userId, current + amountSats);
      })
  );

  const status: TransactionStatus = confirmations >= config.blockchainWatcher.minConfirmations ? 'confirmed' : 'pending';
  const confirmedAt =
    status === 'confirmed' && blocktime ? new Date(blocktime * 1000).toISOString() : null;

  await Promise.all(
    Array.from(perUserAmounts.entries()).map(async ([userId, amountSats]) => {
      const btcAmount = satsToBtc(amountSats);
      const fiatAmount = computeFiatValue(btcAmount, quote);
      await TransactionRepository.upsertInboundTransaction(userId, txid, amountSats, status, {
        confirmations,
        confirmedAt,
        fiatAmount,
        fiatCurrency: quote?.currency ?? null,
        exchangeRate: quote?.rate ?? null
      });
    })
  );
};

const processOutboundTransaction = async (
  tx: GetTransactionDetails,
  quote: ExchangeRateQuote | null
): Promise<void> => {
  const { txid, confirmations, blocktime } = tx;
  const existing = await TransactionRepository.findByTxid(txid, 'outbound');

  if (!existing) {
    return;
  }

  const status: TransactionStatus = confirmations >= config.blockchainWatcher.minConfirmations ? 'confirmed' : 'pending';
  const confirmedAt =
    status === 'confirmed' && blocktime ? new Date(blocktime * 1000).toISOString() : null;

  const btcAmount = satsToBtc(existing.amountSats);
  const fiatAmount = computeFiatValue(btcAmount, quote) ?? (existing.fiatAmount ? Number(existing.fiatAmount) : null);

  if (
    existing.status === status &&
    existing.confirmations === confirmations &&
    ((fiatAmount === null && !existing.fiatAmount) || (existing.fiatAmount && Number(existing.fiatAmount) === fiatAmount))
  ) {
    return;
  }

  await TransactionRepository.updateConfirmationMetadata(existing.id, status, {
    confirmations,
    confirmedAt,
    fiatAmount,
    fiatCurrency: quote?.currency ?? existing.fiatCurrency ?? null,
    exchangeRate: quote?.rate ?? (existing.exchangeRate ? Number(existing.exchangeRate) : null)
  });
};

const processTransaction = async (
  txid: string,
  category: TransactionDirection,
  quote: ExchangeRateQuote | null
): Promise<void> => {
  const tx = await bitcoinService.getTransaction(txid);

  if (category === 'inbound') {
    await processInboundTransaction(tx, quote);
  } else {
    await processOutboundTransaction(tx, quote);
  }
};

const categorize = (entry: ListTransaction): TransactionDirection | null => {
  if (entry.category === 'receive') {
    return 'inbound';
  }

  if (entry.category === 'send') {
    return 'outbound';
  }

  return null;
};

const poll = async (): Promise<void> => {
  const seen = new Set<string>();
  const entries = await bitcoinService.listTransactions(250, 0, true);
  const quote = await resolveQuote();

  for (const entry of entries) {
    const direction = categorize(entry);
    if (!direction) {
      continue;
    }

    const key = `${entry.txid}-${direction}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    try {
      await processTransaction(entry.txid, direction, quote);
    } catch (error) {
      console.error('Watcher: failed to process transaction', entry.txid, error);
    }
  }
};

const run = async (): Promise<void> => {
  console.log('Starting blockchain watcher with interval', config.blockchainWatcher.pollIntervalMs, 'ms');

  const loop = async () => {
    try {
      await poll();
    } catch (error) {
      console.error('Watcher: polling loop failed', error);
    }
  };

  await loop();
  const interval = setInterval(loop, config.blockchainWatcher.pollIntervalMs);

  const cleanup = async () => {
    console.log('Shutting down blockchain watcher');
    clearInterval(interval);
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
};

void run();
