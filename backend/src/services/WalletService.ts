import bitcoinService from './BitcoinService';
import conversionService from './ConversionService';
import FeeService from './FeeService';
import WalletRepository, { Currency, WalletRow } from '../repositories/WalletRepository';
import { withTransaction } from '../db';
import TransactionRepository from '../repositories/TransactionRepository';
import LedgerRepository from '../repositories/LedgerRepository';
import { PoolClient } from 'pg';
import config from '../../config';

interface BalanceSummary {
  balance: number;
  pending: number;
  depositAddress: string | null;
}

interface WalletBalances {
  BTC: BalanceSummary;
  USD: BalanceSummary;
}

const REQUIRED_CONFIRMATIONS = Math.max(config.blockchainWatcher.minConfirmations ?? 3, 1);

const formatCurrencyAmount = (value: string, decimals: number): number => Number.parseFloat(Number.parseFloat(value).toFixed(decimals));

const ensureWallet = async (userId: number, currency: Currency, client?: PoolClient): Promise<WalletRow> => {
  const existing = client
    ? await WalletRepository.findByUserAndCurrencyForUpdate(userId, currency, client)
    : await WalletRepository.findByUserAndCurrency(userId, currency);

  if (existing) {
    return existing;
  }

  if (client) {
    return WalletRepository.createWallet(userId, currency, client);
  }

  return WalletRepository.createWallet(userId, currency);
};

const ensureRate = async (): Promise<{ rawUsdPerBtc: number }> => {
  try {
    return { rawUsdPerBtc: conversionService.getLatestRate().rawUsdPerBtc };
  } catch (error) {
    await conversionService.fetchAndCache();
    return { rawUsdPerBtc: conversionService.getLatestRate().rawUsdPerBtc };
  }
};

export class WalletService {
  public static async getBalances(userId: number): Promise<WalletBalances> {
    const [btcWallet, usdWallet] = await Promise.all([
      ensureWallet(userId, 'BTC'),
      ensureWallet(userId, 'USD')
    ]);

    return {
      BTC: {
        balance: formatCurrencyAmount(btcWallet.balance, 8),
        pending: formatCurrencyAmount(btcWallet.pendingBalance, 8),
        depositAddress: btcWallet.depositAddress
      },
      USD: {
        balance: formatCurrencyAmount(usdWallet.balance, 2),
        pending: formatCurrencyAmount(usdWallet.pendingBalance, 2),
        depositAddress: usdWallet.depositAddress
      }
    };
  }

  public static async generateDepositAddress(userId: number): Promise<{ address: string }> {
    const label = `user-${userId}`;
    const address = await bitcoinService.getNewAddress(label);

    const wallet = await withTransaction(async (client) => {
      const btcWallet = await ensureWallet(userId, 'BTC', client);
      return WalletRepository.updateDepositAddress(btcWallet.id, address, client);
    });

    return { address: wallet.depositAddress ?? address };
  }

  public static async sendBitcoin(
    userId: number,
    toAddress: string,
    amountBtc: number
  ): Promise<{ txId: string; feeBtc: string; totalDebitBtc: string }> {
    if (amountBtc <= 0) {
      throw new Error('Amount must be positive.');
    }

    const { rawUsdPerBtc } = await ensureRate();
    const amountStr = amountBtc.toFixed(8);
    const fee = FeeService.calculateFee({
      amount: amountBtc,
      currency: 'BTC',
      usdPerBtc: rawUsdPerBtc,
      type: 'transfer'
    });

    const totalDebit = Number.parseFloat(amountStr) + Number.parseFloat(fee.feeAmountCurrency);
    const totalDebitStr = totalDebit.toFixed(8);

    const result = await withTransaction(async (client) => {
      const wallet = await ensureWallet(userId, 'BTC', client);
      const balance = Number.parseFloat(wallet.balance);

      if (totalDebit > balance + Number.EPSILON) {
        throw new Error('Insufficient BTC balance.');
      }

      const transaction = await TransactionRepository.create(
        {
          userId,
          type: 'withdrawal',
          direction: 'debit',
          status: 'pending',
          currency: 'BTC',
          amount: amountStr,
          feeAmount: fee.feeAmountCurrency,
          description: `BTC send to ${toAddress}`,
          metadata: {
            toAddress,
            amountBtc,
            feeCurrency: 'BTC',
            feeUsd: fee.feeAmountUsd
          }
        },
        client
      );

      const txId = await bitcoinService.sendToAddress(toAddress, amountBtc);

      await TransactionRepository.attachHash(transaction.id, txId, client);

      await LedgerRepository.create(
        [
          {
            transactionId: transaction.id,
            walletId: wallet.id,
            direction: 'debit',
            amount: totalDebitStr,
            currency: 'BTC'
          }
        ],
        client
      );

      await WalletRepository.adjustBalances(wallet.id, `-${totalDebitStr}`, '0', client);

      return { txId, feeBtc: fee.feeAmountCurrency, totalDebitBtc: totalDebitStr };
    });

    return result;
  }

  public static async sendUsd(
    userId: number,
    toUserId: number,
    amountUsd: number
  ): Promise<{ feeUsd: string; netAmountUsd: string }> {
    if (userId === toUserId) {
      throw new Error('Sender and recipient must be different users.');
    }

    if (amountUsd <= 0) {
      throw new Error('Amount must be positive.');
    }

    const { rawUsdPerBtc } = await ensureRate();
    const amountStr = amountUsd.toFixed(2);
    const fee = FeeService.calculateFee({
      amount: amountUsd,
      currency: 'USD',
      usdPerBtc: rawUsdPerBtc,
      type: 'transfer'
    });

    const totalDebit = Number.parseFloat(amountStr) + fee.feeAmountUsd;
    const totalDebitStr = totalDebit.toFixed(2);
    const feeStr = fee.feeAmountCurrency;

    await withTransaction(async (client) => {
      const senderWallet = await ensureWallet(userId, 'USD', client);
      const recipientWallet = await ensureWallet(toUserId, 'USD', client);

      const senderBalance = Number.parseFloat(senderWallet.balance);
      if (totalDebit > senderBalance + Number.EPSILON) {
        throw new Error('Insufficient USD balance.');
      }

      const transaction = await TransactionRepository.create(
        {
          userId,
          type: 'transfer',
          direction: 'debit',
          status: 'pending',
          currency: 'USD',
          amount: amountStr,
          feeAmount: feeStr,
          description: `USD send to user ${toUserId}`,
          metadata: {
            toUserId,
            amountUsd,
            feeCurrency: 'USD'
          }
        },
        client
      );

      await LedgerRepository.create(
        [
          {
            transactionId: transaction.id,
            walletId: senderWallet.id,
            direction: 'debit',
            amount: totalDebitStr,
            currency: 'USD'
          },
          {
            transactionId: transaction.id,
            walletId: recipientWallet.id,
            direction: 'credit',
            amount: amountStr,
            currency: 'USD'
          }
        ],
        client
      );

      await WalletRepository.adjustBalances(senderWallet.id, `-${totalDebitStr}`, '0', client);
      await WalletRepository.adjustBalances(recipientWallet.id, amountStr, '0', client);
    });

    return { feeUsd: feeStr, netAmountUsd: amountStr };
  }

  public static async convert(
    userId: number,
    from: Currency,
    amount: number
  ): Promise<{ convertedAmount: number; feeAmount: string; rate: number; direction: string }> {
    const quote = await conversionService.getQuote({ from, amount });

    await withTransaction(async (client) => {
      const sourceWallet = await ensureWallet(userId, from, client);
      const targetCurrency: Currency = from === 'BTC' ? 'USD' : 'BTC';
      const targetWallet = await ensureWallet(userId, targetCurrency, client);

      if (from === 'BTC') {
        const available = Number.parseFloat(sourceWallet.balance);
        if (quote.requestedAmount > available + Number.EPSILON) {
          throw new Error('Insufficient BTC balance for conversion.');
        }

        const transaction = await TransactionRepository.create(
          {
            userId,
            type: 'conversion',
            direction: 'credit',
            status: 'pending',
            currency: 'USD',
            amount: quote.convertedAmount.toFixed(2),
            feeAmount: quote.feeUsd.toFixed(2),
            description: 'Convert BTC to USD',
            metadata: {
              fromCurrency: 'BTC',
              requestedAmount: amount,
              feeCurrency: 'USD',
              rate: quote.rate.raw
            }
          },
          client
        );

        await LedgerRepository.create(
          [
            {
              transactionId: transaction.id,
              walletId: sourceWallet.id,
              direction: 'debit',
              amount: amount.toFixed(8),
              currency: 'BTC'
            },
            {
              transactionId: transaction.id,
              walletId: targetWallet.id,
              direction: 'credit',
              amount: quote.convertedAmount.toFixed(2),
              currency: 'USD'
            }
          ],
          client
        );

        await WalletRepository.adjustBalances(sourceWallet.id, `-${amount.toFixed(8)}`, '0', client);
        await WalletRepository.adjustBalances(targetWallet.id, quote.convertedAmount.toFixed(2), '0', client);
      } else {
        const available = Number.parseFloat(sourceWallet.balance);
        if (amount > available + Number.EPSILON) {
          throw new Error('Insufficient USD balance for conversion.');
        }

        const transaction = await TransactionRepository.create(
          {
            userId,
            type: 'conversion',
            direction: 'credit',
            status: 'pending',
            currency: 'BTC',
            amount: quote.convertedAmount.toFixed(8),
            feeAmount: quote.feeUsd.toFixed(2),
            description: 'Convert USD to BTC',
            metadata: {
              fromCurrency: 'USD',
              requestedAmount: amount,
              feeCurrency: 'USD',
              rate: quote.rate.raw
            }
          },
          client
        );

        await LedgerRepository.create(
          [
            {
              transactionId: transaction.id,
              walletId: sourceWallet.id,
              direction: 'debit',
              amount: amount.toFixed(2),
              currency: 'USD'
            },
            {
              transactionId: transaction.id,
              walletId: targetWallet.id,
              direction: 'credit',
              amount: quote.convertedAmount.toFixed(8),
              currency: 'BTC'
            }
          ],
          client
        );

        await WalletRepository.adjustBalances(sourceWallet.id, `-${amount.toFixed(2)}`, '0', client);
        await WalletRepository.adjustBalances(targetWallet.id, quote.convertedAmount.toFixed(8), '0', client);
      }
    });

    return {
      convertedAmount: quote.convertedAmount,
      feeAmount: quote.feeAmount,
      rate: quote.rate.raw,
      direction: from === 'BTC' ? 'BTC_TO_USD' : 'USD_TO_BTC'
    };
  }

  public static async recordBitcoinDeposit(params: {
    userId: number;
    amountBtc: number;
    txHash: string;
    confirmations: number;
  }): Promise<void> {
    if (params.amountBtc <= 0) {
      throw new Error('Deposit amount must be positive.');
    }

    const { rawUsdPerBtc } = await ensureRate();
    const fee = FeeService.calculateFee({
      amount: params.amountBtc,
      currency: 'BTC',
      usdPerBtc: rawUsdPerBtc,
      type: 'deposit'
    });

    const netAmount = params.amountBtc - Number.parseFloat(fee.feeAmountCurrency);

    if (netAmount <= 0) {
      throw new Error('Deposit amount is too small after fees.');
    }

    const netAmountStr = netAmount.toFixed(8);
    const grossAmountStr = params.amountBtc.toFixed(8);
    const requiredConfirmationsReached = params.confirmations >= REQUIRED_CONFIRMATIONS;

    await withTransaction(async (client) => {
      const wallet = await ensureWallet(params.userId, 'BTC', client);
      const existing = await TransactionRepository.findByHash(params.txHash, client, params.userId);

      if (!existing) {
        const status = requiredConfirmationsReached ? 'confirmed' : 'pending';

        const transaction = await TransactionRepository.create(
          {
            userId: params.userId,
            type: 'deposit',
            direction: 'credit',
            status,
            currency: 'BTC',
            amount: netAmountStr,
            feeAmount: fee.feeAmountCurrency,
            description: 'Inbound BTC deposit',
            txHash: params.txHash,
            metadata: {
              confirmations: params.confirmations,
              grossAmountBtc: grossAmountStr,
              feeUsd: fee.feeAmountUsd,
              feeCurrency: 'BTC'
            }
          },
          client
        );

        if (status === 'pending') {
          await WalletRepository.adjustBalances(wallet.id, '0', netAmountStr, client);
        } else {
          await WalletRepository.adjustBalances(wallet.id, netAmountStr, '0', client);
          await LedgerRepository.create(
            [
              {
                transactionId: transaction.id,
                walletId: wallet.id,
                direction: 'credit',
                amount: netAmountStr,
                currency: 'BTC'
              }
            ],
            client
          );
        }

        return;
      }

      await TransactionRepository.updateMetadata(existing.id, {
        confirmations: params.confirmations,
        updatedAt: new Date().toISOString()
      }, client);

      if (existing.status === 'confirmed') {
        return;
      }

      if (requiredConfirmationsReached) {
        const updated = await TransactionRepository.updateStatus(existing.id, 'confirmed', client);
        const confirmedAmount = Number.parseFloat(updated.amount);
        const confirmedAmountStr = confirmedAmount.toFixed(8);

        await WalletRepository.adjustBalances(wallet.id, confirmedAmountStr, `-${confirmedAmountStr}`, client);
        await LedgerRepository.create(
          [
            {
              transactionId: updated.id,
              walletId: wallet.id,
              direction: 'credit',
              amount: confirmedAmountStr,
              currency: 'BTC'
            }
          ],
          client
        );
      }
    });
  }
}

export default WalletService;
