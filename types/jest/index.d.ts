// Minimal Jest type declarations to satisfy TypeScript in environments without @types/jest.
// These cover only the APIs exercised in our test suite. For full typings install @types/jest.
declare namespace jest {
  type DoneCallback = (error?: string | Error) => void;

  interface Matchers<R> {
    toBe(value: unknown): R;
    toEqual(value: unknown): R;
    toBeTruthy(): R;
    toBeFalsy(): R;
    toBeDefined(): R;
    toBeUndefined(): R;
    toBeNull(): R;
  }

  interface Expect {
    <T = unknown>(actual: T): Matchers<T>;
  }

  interface Describe {
    (name: string, fn: () => void): void;
  }

  interface It {
    (name: string, fn: (done?: DoneCallback) => void): void;
  }

  interface BeforeAfter {
    (fn: (done?: DoneCallback) => void): void;
  }
}

declare const describe: jest.Describe;
declare const it: jest.It;
declare const test: jest.It;
declare const expect: jest.Expect;
declare const beforeEach: jest.BeforeAfter;
declare const afterEach: jest.BeforeAfter;
