import { Request, Response } from 'express';
import TransactionRepository from '../../repositories/TransactionRepository';

export class TransactionController {
  public static async list(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const limitParam = Number.parseInt((req.query.limit as string) ?? '20', 10);
    const offsetParam = Number.parseInt((req.query.offset as string) ?? '0', 10);

    const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100);
    const offset = Number.isNaN(offsetParam) ? 0 : Math.max(offsetParam, 0);

    try {
      const transactions = await TransactionRepository.list({ userId: req.user.id, limit, offset });
      return res.status(200).json({ transactions, pagination: { limit, offset } });
    } catch (error) {
      return res.status(500).json({ message: 'Unable to fetch transactions', error: (error as Error).message });
    }
  }
}

export default TransactionController;
