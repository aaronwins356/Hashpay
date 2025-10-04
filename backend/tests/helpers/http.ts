import type { Request } from 'express';

type JsonValue = Record<string, unknown> | Record<string, unknown>[] | string | number | boolean | null;

export interface MockResponse<T = JsonValue> {
  statusCode: number;
  body?: T;
  headers: Record<string, string>;
  status(code: number): this;
  json(payload: T): this;
  setHeader(name: string, value: string): this;
}

export const createMockResponse = <T = JsonValue>(): MockResponse<T> => {
  return {
    statusCode: 200,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: T) {
      this.body = JSON.parse(JSON.stringify(payload)) as T;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    }
  };
};

export type MockRequest<TBody = unknown> = Partial<Request> & { body?: TBody };
