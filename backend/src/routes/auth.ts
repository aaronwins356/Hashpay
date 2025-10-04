import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import { authMiddleware } from '../middleware/auth';
import { authSchemas, validate } from '../middleware/validate';

const router = Router();

router.post('/signup', validate({ body: authSchemas.signup }), AuthController.signup);
router.post('/login', validate({ body: authSchemas.login }), AuthController.login);
router.get('/me', authMiddleware, AuthController.me);

export default router;
