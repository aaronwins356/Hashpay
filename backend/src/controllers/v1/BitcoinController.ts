import { Request, Response } from 'express';
import WalletService from '../../services/WalletService';

export class BitcoinController {
  public static async createAddress(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const response = await WalletService.generateDepositAddress(req.user.id);
      return res.status(201).json(response);
    } catch (error) {
      return res.status(502).json({ message: 'Unable to generate BTC address', error: (error as Error).message });
    }
  }

  public static async send(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { toAddress, amountBtc } = req.body as { toAddress?: string; amountBtc?: number };

    if (!toAddress || typeof toAddress !== 'string') {
      return res.status(400).json({ message: 'Destination Bitcoin address is required.' });
    }

    if (typeof amountBtc !== 'number' || Number.isNaN(amountBtc)) {
      return res.status(400).json({ message: 'amountBtc must be a numeric value.' });
    }

    try {
      const result = await WalletService.sendBitcoin(req.user.id, toAddress, amountBtc);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }
}

export default BitcoinController;
