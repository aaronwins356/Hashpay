import './helpers/env';
import { run } from './utils/harness';

import './unit/controllers/AuthController.test';
import './unit/controllers/WalletController.test';
import './unit/middleware/authMiddleware.test';

(async () => {
  await run();
})();
