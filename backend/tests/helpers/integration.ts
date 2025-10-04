import type { Pool } from 'pg';
import { createInMemoryDatabase, destroyDatabase, resetModuleCache } from './database';

export interface TestServices {
  pool: Pool;
  cleanup: () => Promise<void>;
  WalletService: typeof import('../../src/services/WalletService').default;
  WalletRepository: typeof import('../../src/repositories/WalletRepository').default;
  TransactionRepository: typeof import('../../src/repositories/TransactionRepository').default;
  LedgerRepository: typeof import('../../src/repositories/LedgerRepository').default;
  conversionService: typeof import('../../src/services/ConversionService').default;
  bitcoinService: typeof import('../../src/services/BitcoinService').default;
}

export const setupIntegrationServices = async (): Promise<TestServices> => {
  resetModuleCache();
  const { pool } = await createInMemoryDatabase();

  const [WalletServiceModule, WalletRepositoryModule, TransactionRepositoryModule, LedgerRepositoryModule, conversionServiceModule, bitcoinServiceModule] =
    await Promise.all([
      import('../../src/services/WalletService'),
      import('../../src/repositories/WalletRepository'),
      import('../../src/repositories/TransactionRepository'),
      import('../../src/repositories/LedgerRepository'),
      import('../../src/services/ConversionService'),
      import('../../src/services/BitcoinService'),
    ]);

  return {
    pool,
    cleanup: async () => {
      await destroyDatabase(pool);
      resetModuleCache();
    },
    WalletService: WalletServiceModule.default,
    WalletRepository: WalletRepositoryModule.default,
    TransactionRepository: TransactionRepositoryModule.default,
    LedgerRepository: LedgerRepositoryModule.default,
    conversionService: conversionServiceModule.default,
    bitcoinService: bitcoinServiceModule.default,
  };
};

