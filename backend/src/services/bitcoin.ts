import axios, { AxiosInstance } from 'axios';
import config from '../../config';

interface RpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: unknown[];
}

interface RpcError {
  code: number;
  message: string;
}

interface RpcResponse<T> {
  result: T;
  error: RpcError | null;
  id: string;
}

class BitcoinRpcService {
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

  public async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const payload: RpcRequest = {
      jsonrpc: '2.0',
      id: `${Date.now()}`,
      method,
      params
    };

    const { data } = await this.client.post<RpcResponse<T>>('/', payload);

    if (data.error) {
      const error = new Error(data.error.message);
      (error as Error & { code?: number }).code = data.error.code;
      throw error;
    }

    return data.result;
  }
}

const bitcoinRpcService = new BitcoinRpcService();

export default bitcoinRpcService;
