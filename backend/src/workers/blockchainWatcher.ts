/* eslint-disable no-console */
import 'dotenv/config';
import config from '../../config';
import '../db';
import bitcoinService from '../services/BitcoinService';
import WalletService from '../services/WalletService';

const POLL_INTERVAL_MS = config.blockchainWatcher.pollIntervalMs ?? 30_000;

const USER_LABEL_REGEX = /^user-(\d+)$/;

const parseUserIdFromLabel = (label?: string): number | null => {
  if (!label) {
    return null;
  }

  const match = USER_LABEL_REGEX.exec(label.trim());
  if (!match) {
    return null;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
};

const pollOnce = async (): Promise<void> => {
  const seen = new Set<string>();
  const transactions = await bitcoinService.listTransactions(250, 0, true);

  for (const entry of transactions) {
    if (entry.category !== 'receive') {
      continue;
    }

    const userId = parseUserIdFromLabel(entry.label);
    if (!userId) {
      continue;
    }

    const key = `${entry.txid}:${userId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    try {
      await WalletService.recordBitcoinDeposit({
        userId,
        amountBtc: Math.abs(entry.amount),
        txHash: entry.txid,
        confirmations: entry.confirmations
      });
    } catch (error) {
      console.error('Watcher: failed to record BTC deposit', entry.txid, error);
    }
  }
};

const run = async (): Promise<void> => {
  console.log('Bitcoin watcher initialised, polling every', POLL_INTERVAL_MS, 'ms');

  const executePoll = async () => {
    try {
      await pollOnce();
    } catch (error) {
      console.error('Watcher: poll execution failed', error);
    }
  };

  await executePoll();
  setInterval(executePoll, POLL_INTERVAL_MS);
};

void run();
