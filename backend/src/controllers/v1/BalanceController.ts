import { Request, Response } from 'express';
import WalletService from '../../services/WalletService';

export class BalanceController {
  public static async getBalance(req: Request, res: Response): Promise<Response> {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const snapshot = await WalletService.getBalances(req.user.id);
      return res.status(200).json({
        btcBalance: snapshot.balances.BTC,
        usdBalance: snapshot.balances.USD,
        rates: { usdPerBtc: snapshot.usdPerBtc },
      });
    } catch (error) {
      return res.status(500).json({ message: 'Unable to fetch balances', error: (error as Error).message });
    }
  }
}

export default BalanceController;
