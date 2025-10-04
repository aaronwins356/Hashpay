import '../../helpers/env';
import WalletController, {
  resetWalletControllerDependencies,
  setWalletControllerDependencies
} from '../../../src/controllers/WalletController';
import { describe, it, beforeEach, expect } from '../../utils/harness';
import { createMockResponse, MockRequest } from '../../helpers/http';

type SendBody = { address: string; amount: number };

describe('WalletController', () => {
  let balanceSummary = { confirmedSats: 123_450_000n, pendingSats: 10_000n };
  let addressResult = 'tb1qexampleaddress0000000000000000000000000000000';
  let sendResult = 'tx123';

  const getNewAddressCalls: number[] = [];
  const sendCalls: Array<[string, number]> = [];
  const logPendingSendCalls: Array<[
    number,
    string,
    bigint,
    bigint,
    bigint,
    Record<string, unknown>
  ]> = [];

  const mockBitcoinService = {
    async getNewAddress() {
      getNewAddressCalls.push(1);
      return addressResult;
    },
    async sendToAddress(address: string, amount: number) {
      sendCalls.push([address, amount]);
      return sendResult;
    }
  };

  const mockTransactionRepository = {
    async logPendingSend(
      userId: number,
      txid: string,
      amount: bigint,
      networkFee: bigint,
      serviceFee: bigint,
      metadata: Record<string, unknown>
    ) {
      logPendingSendCalls.push([userId, txid, amount, networkFee, serviceFee, metadata]);
      return {
        id: 1,
        userId,
        txid,
        amountSats: amount.toString(),
        networkFee: networkFee.toString(),
        serviceFee: serviceFee.toString(),
        status: 'pending' as const,
        direction: 'outbound' as const,
        fiatAmount: metadata.fiatAmount ? String(metadata.fiatAmount) : null,
        fiatCurrency: metadata.fiatCurrency ?? null,
        exchangeRate: metadata.exchangeRate ? String(metadata.exchangeRate) : null,
        confirmations: metadata.confirmations ?? 0,
        confirmedAt: null,
        createdAt: new Date()
      };
    },
    async getUserBalanceSummary() {
      return balanceSummary;
    },
    async getTransactionsForUser() {
      return [];
    }
  };

  const mockWalletRepository = {
    async createWallet() {
      return null;
    }
  };

  const mockExchangeRateService = {
    async getLatestQuote() {
      return {
        currency: 'USD',
        rate: 20_000,
        fetchedAt: new Date('2024-01-01T00:00:00.000Z')
      };
    }
  };

  beforeEach(() => {
    balanceSummary = { confirmedSats: 123_450_000n, pendingSats: 10_000n };
    addressResult = 'tb1qexampleaddress0000000000000000000000000000000';
    sendResult = 'tx123';

    getNewAddressCalls.length = 0;
    sendCalls.length = 0;
    logPendingSendCalls.length = 0;

    resetWalletControllerDependencies();
    setWalletControllerDependencies({
      bitcoinService: mockBitcoinService as any,
      transactionRepository: mockTransactionRepository as any,
      walletRepository: mockWalletRepository as any,
      exchangeRateService: mockExchangeRateService as any
    });
  });

  it('returns the wallet balance for an authenticated user', async () => {
    const req: MockRequest = { user: { id: 1 } };
    const res = createMockResponse();

    const response = await WalletController.balance(req as any, res as any);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      balance: {
        confirmed: {
          sats: '123450000',
          btc: 1.2345,
          fiat: 24_690,
          fiatCurrency: 'USD'
        },
        pending: {
          sats: '10000',
          btc: 0.0001,
          fiat: 2,
          fiatCurrency: 'USD'
        },
        exchangeRate: {
          fiatPerBtc: 20_000,
          currency: 'USD',
          asOf: '2024-01-01T00:00:00.000Z'
        }
      }
    });
  });

  it('rejects sending to an invalid address', async () => {
    const req: MockRequest<SendBody> = {
      user: { id: 1 },
      body: { address: 'invalid-address', amount: 0.001 }
    };
    const res = createMockResponse();

    const response = await WalletController.send(req as any, res as any);

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ message: 'A valid Bitcoin testnet address is required.' });
    expect(sendCalls.length).toBe(0);
  });

  it('applies the service fee and logs the transaction when sending funds', async () => {
    const req: MockRequest<SendBody> = {
      user: { id: 1 },
      body: { address: ' tb1qtestaddress000000000000000000000000000000000 ', amount: 0.02 }
    };
    const res = createMockResponse();

    const response = await WalletController.send(req as any, res as any);

    expect(sendCalls[0]).toEqual(['tb1qtestaddress000000000000000000000000000000000', 0.0198]);
    const [userId, txid, amount, networkFee, serviceFee, metadata] = logPendingSendCalls[0];
    expect(userId).toBe(1);
    expect(txid).toBe('tx123');
    expect(amount).toBe(2_000_000n);
    expect(networkFee).toBe(0n);
    expect(serviceFee).toBe(20_000n);
    expect(metadata).toMatchObject({
      fiatAmount: 400,
      fiatCurrency: 'USD',
      exchangeRate: 20_000
    });
    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      txid: 'tx123',
      amountBtc: 0.02,
      status: 'pending'
    });
    expect(response.body.serviceFeeBtc).toBeCloseTo(0.0002, 10);
    expect(response.body.networkFeeBtc).toBeCloseTo(0, 10);
  });
});
