import axios, { AxiosInstance } from 'axios';
import config from '../../config';

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: unknown[];
};

type JsonRpcError = {
  code: number;
  message: string;
};

type JsonRpcResponse<T> = {
  result: T;
  error: JsonRpcError | null;
  id: string;
};

export class BitcoinService {
  private readonly client: AxiosInstance;

  constructor() {
    const { host, port, username, password } = config.bitcoinRpc;

    this.client = axios.create({
      baseURL: `http://${host}:${port}`,
      auth: {
        username,
        password
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
  }

  public async rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: `${Date.now()}`,
      method,
      params
    };

    const { data } = await this.client.post<JsonRpcResponse<T>>('/', payload);

    if (data.error) {
      const error = new Error(data.error.message);
      (error as Error & { code?: number }).code = data.error.code;
      throw error;
    }

    return data.result;
  }

  public async getBalance(): Promise<number> {
    return this.rpcCall<number>('getbalance');
  }

  public async getNewAddress(): Promise<string> {
    return this.rpcCall<string>('getnewaddress');
  }

  public async sendToAddress(address: string, amount: number): Promise<string> {
    return this.rpcCall<string>('sendtoaddress', [address, amount]);
  }
}

const bitcoinService = new BitcoinService();

export default bitcoinService;
