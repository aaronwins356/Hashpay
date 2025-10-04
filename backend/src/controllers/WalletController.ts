import { Request, Response } from 'express';
import config from '../../config';
import bitcoinService from '../services/BitcoinService';
import TransactionRepository from '../repositories/TransactionRepository';
import WalletRepository from '../repositories/WalletRepository';
import exchangeRateService from '../services/ExchangeRateService';
import { TESTNET_ADDRESS_REGEX } from '../middleware/validate';
import { sanitizeInput } from '../utils/sanitize';

const SATS_PER_BTC = 100_000_000n;
const SATS_PER_BTC_NUMBER = Number(SATS_PER_BTC);
const SERVICE_FEE_PERCENT = 1n; // 1%

type WalletDependencies = {
  bitcoinService: typeof bitcoinService;
  transactionRepository: typeof TransactionRepository;
  walletRepository: typeof WalletRepository;
  exchangeRateService: typeof exchangeRateService;
};

const walletDependencies: WalletDependencies = {
  bitcoinService,
  transactionRepository: TransactionRepository,
  walletRepository: WalletRepository,
  exchangeRateService
};

export const setWalletControllerDependencies = (overrides: Partial<WalletDependencies>): void => {
  Object.assign(walletDependencies, overrides);
};

export const resetWalletControllerDependencies = (): void => {
  walletDependencies.bitcoinService = bitcoinService;
  walletDependencies.transactionRepository = TransactionRepository;
  walletDependencies.walletRepository = WalletRepository;
  walletDependencies.exchangeRateService = exchangeRateService;
};

const toSats = (amountBtc: number): bigint => BigInt(Math.round(amountBtc * SATS_PER_BTC_NUMBER));

const isValidTestnetAddress = (address: string): boolean => TESTNET_ADDRESS_REGEX.test(address);

const formatBtcFromSats = (sats: bigint): number => Number(sats) / SATS_PER_BTC_NUMBER;

const computeFiatValue = (btc: number, rate: number): number => {
  const fiat = btc * rate;
  return Math.round(fiat * 100) / 100;
};

export class WalletController {
  public static async balance(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const { confirmedSats, pendingSats } = await walletDependencies.transactionRepository.getUserBalanceSummary(
        req.user.id
      );

      let fiatQuoteRate: number | null = null;
      let fiatCurrency: string | null = null;
      let quoteTimestamp: string | null = null;

      try {
        const quote = await walletDependencies.exchangeRateService.getLatestQuote();
        fiatQuoteRate = quote.rate;
        fiatCurrency = quote.currency;
        quoteTimestamp = quote.fetchedAt.toISOString();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to resolve exchange rate:', error);
      }

      const confirmedBtc = formatBtcFromSats(confirmedSats);
      const pendingBtc = formatBtcFromSats(pendingSats);

      const confirmedFiat =
        fiatQuoteRate !== null ? computeFiatValue(confirmedBtc, fiatQuoteRate) : null;
      const pendingFiat = fiatQuoteRate !== null ? computeFiatValue(pendingBtc, fiatQuoteRate) : null;

      return res.status(200).json({
        balance: {
          confirmed: {
            sats: confirmedSats.toString(),
            btc: confirmedBtc,
            fiat: confirmedFiat,
            fiatCurrency
          },
          pending: {
            sats: pendingSats.toString(),
            btc: pendingBtc,
            fiat: pendingFiat,
            fiatCurrency
          },
          exchangeRate: fiatQuoteRate
            ? {
                fiatPerBtc: fiatQuoteRate,
                currency: fiatCurrency,
                asOf: quoteTimestamp
              }
            : null
        }
      });
    } catch (error) {
      return res.status(502).json({ message: 'Unable to fetch wallet balance.', error: (error as Error).message });
    }
  }

  public static async address(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const label = `user-${req.user.id}`;
      const address = await walletDependencies.bitcoinService.getNewAddress(label);
      await walletDependencies.walletRepository.createWallet(req.user.id, address, label);
      return res.status(200).json({ address, label });
    } catch (error) {
      return res.status(502).json({ message: 'Unable to generate address.', error: (error as Error).message });
    }
  }

  public static async send(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { address, amount } = req.body as { address: string; amount: number };

    if (amount > config.wallet.maxWithdrawBtc) {
      return res
        .status(400)
        .json({
          message: `Amount exceeds maximum withdrawal limit of ${config.wallet.maxWithdrawBtc} BTC per transaction.`
        });
    }

    const sanitizedAddress = sanitizeInput(address);

    if (!isValidTestnetAddress(sanitizedAddress)) {
      return res.status(400).json({ message: 'A valid Bitcoin testnet address is required.' });
    }

    try {
      const amountSats = toSats(amount);
      const serviceFeeSats = (amountSats * SERVICE_FEE_PERCENT) / 100n;
      const sendAmountSats = amountSats - serviceFeeSats;

      if (sendAmountSats <= 0n) {
        return res.status(400).json({ message: 'Amount is too small after fees.' });
      }

      const sendAmountBtc = Number(sendAmountSats) / SATS_PER_BTC_NUMBER;
      const txid = await walletDependencies.bitcoinService.sendToAddress(sanitizedAddress, sendAmountBtc);

      const networkFeeSats = 0n;

      let fiatRate: number | null = null;
      let fiatCurrency: string | null = null;
      try {
        const quote = await walletDependencies.exchangeRateService.getLatestQuote();
        fiatRate = quote.rate;
        fiatCurrency = quote.currency;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Unable to fetch fiat rate for send transaction:', error);
      }

      const fiatAmount = fiatRate !== null ? computeFiatValue(Number(amountSats) / SATS_PER_BTC_NUMBER, fiatRate) : null;

      const transaction = await walletDependencies.transactionRepository.logPendingSend(
        req.user.id,
        txid,
        amountSats,
        networkFeeSats,
        serviceFeeSats,
        {
          fiatAmount,
          fiatCurrency,
          exchangeRate: fiatRate
        }
      );

      return res.status(201).json({
        txid,
        amountBtc: amount,
        serviceFeeBtc: Number(serviceFeeSats) / SATS_PER_BTC_NUMBER,
        networkFeeBtc: Number(networkFeeSats) / SATS_PER_BTC_NUMBER,
        fiatAmount,
        fiatCurrency,
        exchangeRate: fiatRate,
        status: transaction.status
      });
    } catch (error) {
      return res.status(502).json({ message: 'Unable to send transaction.', error: (error as Error).message });
    }
  }

  public static async history(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const transactions = await walletDependencies.transactionRepository.getTransactionsForUser(
        req.user.id
      );
      const formatted = transactions.map(transaction => {
        const amountBtc = Number(transaction.amountSats) / SATS_PER_BTC_NUMBER;
        const networkFeeBtc = Number(transaction.networkFee) / SATS_PER_BTC_NUMBER;
        const serviceFeeBtc = Number(transaction.serviceFee) / SATS_PER_BTC_NUMBER;
        return {
          id: transaction.id,
          txid: transaction.txid,
          direction: transaction.direction,
          status: transaction.status,
          amountBtc,
          networkFeeBtc,
          serviceFeeBtc,
          fiatAmount: transaction.fiatAmount ? Number(transaction.fiatAmount) : null,
          fiatCurrency: transaction.fiatCurrency,
          exchangeRate: transaction.exchangeRate ? Number(transaction.exchangeRate) : null,
          confirmations: transaction.confirmations,
          confirmedAt: transaction.confirmedAt,
          createdAt: transaction.createdAt
        };
      });
      return res.status(200).json({ transactions: formatted });
    } catch (error) {
      return res.status(500).json({ message: 'Unable to fetch transaction history.', error: (error as Error).message });
    }
  }
}

export default WalletController;
