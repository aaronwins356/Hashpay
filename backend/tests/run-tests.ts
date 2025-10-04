import './helpers/env';
import { run } from './utils/harness';

import './unit/controllers/AuthController.test';
import './unit/services/FeeService.test';
import './unit/middleware/authMiddleware.test';

(async () => {
  await run();
})();
