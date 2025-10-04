import { Router } from 'express';
import authMiddleware from '../../middleware/auth';
import BalanceController from '../../controllers/v1/BalanceController';
import BitcoinController from '../../controllers/v1/BitcoinController';
import UsdController from '../../controllers/v1/UsdController';
import ConversionController from '../../controllers/v1/ConversionController';
import TransactionController from '../../controllers/v1/TransactionController';
import WebhookController from '../../controllers/v1/WebhookController';

const router = Router();

router.get('/balance', authMiddleware, BalanceController.getBalance);
router.post('/btc/address', authMiddleware, BitcoinController.createAddress);
router.post('/btc/send', authMiddleware, BitcoinController.send);
router.post('/usd/send', authMiddleware, UsdController.send);
router.post('/convert/quote', authMiddleware, ConversionController.quote);
router.post('/convert/execute', authMiddleware, ConversionController.execute);
router.get('/transactions', authMiddleware, TransactionController.list);
router.post('/webhook/btc', WebhookController.handleBitcoinDeposit);

export default router;
