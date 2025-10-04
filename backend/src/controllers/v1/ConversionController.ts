import { Request, Response } from 'express';
import conversionService from '../../services/ConversionService';
import WalletService from '../../services/WalletService';
import { Currency } from '../../repositories/WalletRepository';

const isCurrency = (value: unknown): value is Currency => value === 'BTC' || value === 'USD';

export class ConversionController {
  public static async quote(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { from, amount } = req.body as { from?: unknown; amount?: unknown };

    if (!isCurrency(from)) {
      return res.status(400).json({ message: 'from must be BTC or USD.' });
    }

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number.' });
    }

    try {
      const quote = await conversionService.getQuote({ from, amount });
      return res.status(200).json(quote);
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  public static async execute(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { from, amount } = req.body as { from?: unknown; amount?: unknown };

    if (!isCurrency(from)) {
      return res.status(400).json({ message: 'from must be BTC or USD.' });
    }

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number.' });
    }

    try {
      const result = await WalletService.convert(req.user.id, from, amount);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }
}

export default ConversionController;
