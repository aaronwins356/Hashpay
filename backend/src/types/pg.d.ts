declare module 'pg' {
  export type QueryResult<T = unknown> = {
    rows: T[];
  };

  export interface PoolClient {
    release(): void;
    query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  }

  export class Pool {
    constructor(config?: unknown);
    query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    on(event: string, listener: (...args: unknown[]) => void): void;
  }
}
