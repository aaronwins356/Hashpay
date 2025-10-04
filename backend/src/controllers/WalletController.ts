import { Request, Response } from 'express';
import config from '../../config';
import bitcoinService from '../services/BitcoinService';
import TransactionRepository from '../repositories/TransactionRepository';
import { TESTNET_ADDRESS_REGEX } from '../middleware/validate';
import { sanitizeInput } from '../utils/sanitize';

const SATS_PER_BTC = 100_000_000n;
const SATS_PER_BTC_NUMBER = Number(SATS_PER_BTC);
const SERVICE_FEE_PERCENT = 1n; // 1%

type WalletDependencies = {
  bitcoinService: typeof bitcoinService;
  transactionRepository: typeof TransactionRepository;
};

const walletDependencies: WalletDependencies = {
  bitcoinService,
  transactionRepository: TransactionRepository
};

export const setWalletControllerDependencies = (overrides: Partial<WalletDependencies>): void => {
  Object.assign(walletDependencies, overrides);
};

export const resetWalletControllerDependencies = (): void => {
  walletDependencies.bitcoinService = bitcoinService;
  walletDependencies.transactionRepository = TransactionRepository;
};

const toSats = (amountBtc: number): bigint => BigInt(Math.round(amountBtc * SATS_PER_BTC_NUMBER));

const isValidTestnetAddress = (address: string): boolean => TESTNET_ADDRESS_REGEX.test(address);

export class WalletController {
  public static async balance(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const balance = await walletDependencies.bitcoinService.getBalance();
      return res.status(200).json({ balance });
    } catch (error) {
      return res.status(502).json({ message: 'Unable to fetch wallet balance.', error: (error as Error).message });
    }
  }

  public static async address(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const address = await walletDependencies.bitcoinService.getNewAddress();
      return res.status(200).json({ address });
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

      const transaction = await walletDependencies.transactionRepository.logPendingSend(
        req.user.id,
        txid,
        amountSats,
        networkFeeSats,
        serviceFeeSats
      );

      return res.status(201).json({
        txid,
        amountBtc: amount,
        serviceFeeBtc: Number(serviceFeeSats) / SATS_PER_BTC_NUMBER,
        networkFeeBtc: Number(networkFeeSats) / SATS_PER_BTC_NUMBER,
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
      return res.status(200).json({ transactions });
    } catch (error) {
      return res.status(500).json({ message: 'Unable to fetch transaction history.', error: (error as Error).message });
    }
  }
}

export default WalletController;
