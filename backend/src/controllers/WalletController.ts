import { Request, Response } from 'express';
import bitcoinService from '../services/BitcoinService';
import TransactionRepository from '../repositories/TransactionRepository';

const SATS_PER_BTC = 100_000_000n;
const SATS_PER_BTC_NUMBER = Number(SATS_PER_BTC);
const SERVICE_FEE_PERCENT = 1n; // 1%

const toSats = (amountBtc: number): bigint => BigInt(Math.round(amountBtc * SATS_PER_BTC_NUMBER));

const isValidTestnetAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  const normalized = address.trim();
  const testnetRegex = /^(tb1[ac-hj-np-z02-9]{39,59}|bcrt1[ac-hj-np-z02-9]{39,59}|[mn2][1-9A-HJ-NP-Za-km-z]{25,39})$/;
  return testnetRegex.test(normalized);
};

export class WalletController {
  public static async balance(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const balance = await bitcoinService.getBalance();
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
      const address = await bitcoinService.getNewAddress();
      return res.status(200).json({ address });
    } catch (error) {
      return res.status(502).json({ message: 'Unable to generate address.', error: (error as Error).message });
    }
  }

  public static async send(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { address, amount } = req.body as { address?: string; amount?: number };

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    if (!address || !isValidTestnetAddress(address)) {
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
      const txid = await bitcoinService.sendToAddress(address, sendAmountBtc);

      const networkFeeSats = 0n;

      const transaction = await TransactionRepository.logPendingSend(
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
      const transactions = await TransactionRepository.getTransactionsForUser(req.user.id);
      return res.status(200).json({ transactions });
    } catch (error) {
      return res.status(500).json({ message: 'Unable to fetch transaction history.', error: (error as Error).message });
    }
  }
}

export default WalletController;
