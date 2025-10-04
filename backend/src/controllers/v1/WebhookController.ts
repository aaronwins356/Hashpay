import { Request, Response } from 'express';
import WalletService from '../../services/WalletService';

export class WebhookController {
  public static async handleBitcoinDeposit(req: Request, res: Response): Promise<Response> {
    const { userId, txHash, amountBtc, confirmations } = req.body as {
      userId?: number;
      txHash?: string;
      amountBtc?: number;
      confirmations?: number;
    };

    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({ message: 'userId is required.' });
    }

    if (!txHash || typeof txHash !== 'string') {
      return res.status(400).json({ message: 'txHash is required.' });
    }

    if (typeof amountBtc !== 'number' || amountBtc <= 0) {
      return res.status(400).json({ message: 'amountBtc must be positive.' });
    }

    if (typeof confirmations !== 'number' || confirmations < 0) {
      return res.status(400).json({ message: 'confirmations must be a non-negative number.' });
    }

    try {
      await WalletService.recordBitcoinDeposit({ userId, txHash, amountBtc, confirmations });
      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }
}

export default WebhookController;
