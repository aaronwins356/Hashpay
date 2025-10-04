import { Router } from 'express';
import WalletController from '../controllers/WalletController';
import authMiddleware from '../middleware/auth';
import { validate, walletSchemas } from '../middleware/validate';

const router = Router();

router.use(authMiddleware);

/**
 * Example usage:
 * GET /wallet/balance -> { "balance": 0.12345678 }
 * GET /wallet/address -> { "address": "tb1qexample..." }
 * POST /wallet/send { "address": "tb1qexample...", "amount": 0.001 }
 *   -> { "txid": "...", "amountBtc": 0.001, "serviceFeeBtc": 0.00001, "networkFeeBtc": 0 }
 * GET /wallet/history -> { "transactions": [ ... ] }
 */
router.get('/balance', WalletController.balance);
router.get('/address', WalletController.address);
router.post('/send', validate({ body: walletSchemas.send }), WalletController.send);
router.get('/history', WalletController.history);

export default router;
