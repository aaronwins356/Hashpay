import { Request, Response } from 'express';
import WalletService from '../../services/WalletService';

export class UsdController {
  public static async send(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { toUserId, amountUsd } = req.body as { toUserId?: number; amountUsd?: number };

    if (!toUserId || typeof toUserId !== 'number') {
      return res.status(400).json({ message: 'toUserId must be provided.' });
    }

    if (typeof amountUsd !== 'number' || Number.isNaN(amountUsd)) {
      return res.status(400).json({ message: 'amountUsd must be numeric.' });
    }

    try {
      const result = await WalletService.sendUsd(req.user.id, toUserId, amountUsd);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }
}

export default UsdController;
