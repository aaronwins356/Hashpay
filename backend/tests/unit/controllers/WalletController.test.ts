import '../../helpers/env';
import WalletController, {
  resetWalletControllerDependencies,
  setWalletControllerDependencies
} from '../../../src/controllers/WalletController';
import { describe, it, beforeEach, expect } from '../../utils/harness';
import { createMockResponse, MockRequest } from '../../helpers/http';

type SendBody = { address: string; amount: number };

describe('WalletController', () => {
  let balanceResult = 1.2345;
  let addressResult = 'tb1qexampleaddress0000000000000000000000000000000';
  let sendResult = 'tx123';

  const getBalanceCalls: number[] = [];
  const getNewAddressCalls: number[] = [];
  const sendCalls: Array<[string, number]> = [];
  const logPendingSendCalls: Array<[number, string, bigint, bigint, bigint]> = [];

  const mockBitcoinService = {
    async getBalance() {
      getBalanceCalls.push(1);
      return balanceResult;
    },
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
    async logPendingSend(userId: number, txid: string, amount: bigint, networkFee: bigint, serviceFee: bigint) {
      logPendingSendCalls.push([userId, txid, amount, networkFee, serviceFee]);
      return {
        id: 1,
        userId,
        txid,
        amountSats: amount.toString(),
        networkFee: networkFee.toString(),
        serviceFee: serviceFee.toString(),
        status: 'pending' as const,
        createdAt: new Date()
      };
    },
    async getTransactionsForUser() {
      return [];
    }
  };

  beforeEach(() => {
    balanceResult = 1.2345;
    addressResult = 'tb1qexampleaddress0000000000000000000000000000000';
    sendResult = 'tx123';

    getBalanceCalls.length = 0;
    getNewAddressCalls.length = 0;
    sendCalls.length = 0;
    logPendingSendCalls.length = 0;

    resetWalletControllerDependencies();
    setWalletControllerDependencies({
      bitcoinService: mockBitcoinService as any,
      transactionRepository: mockTransactionRepository as any
    });
  });

  it('returns the wallet balance for an authenticated user', async () => {
    const req: MockRequest = { user: { id: 1 } };
    const res = createMockResponse();

    const response = await WalletController.balance(req as any, res as any);

    expect(getBalanceCalls.length).toBe(1);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ balance: balanceResult });
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
    expect(logPendingSendCalls[0]).toEqual([1, 'tx123', 2_000_000n, 0n, 20_000n]);
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
