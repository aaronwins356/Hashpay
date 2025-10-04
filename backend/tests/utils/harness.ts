import assert from 'node:assert/strict';

type TestFn = () => void | Promise<void>;

type TestCase = {
  name: string;
  fn: TestFn;
};

type Suite = {
  name: string;
  tests: TestCase[];
  beforeEachFns: TestFn[];
  children: Suite[];
};

const rootSuite: Suite = { name: 'root', tests: [], beforeEachFns: [], children: [] };
const suiteStack: Suite[] = [rootSuite];

const currentSuite = (): Suite => suiteStack[suiteStack.length - 1];

export const describe = (name: string, fn: () => void): void => {
  const suite: Suite = { name, tests: [], beforeEachFns: [], children: [] };
  currentSuite().children.push(suite);
  suiteStack.push(suite);
  try {
    fn();
  } finally {
    suiteStack.pop();
  }
};

export const it = (name: string, fn: TestFn): void => {
  currentSuite().tests.push({ name, fn });
};

export const beforeEach = (fn: TestFn): void => {
  currentSuite().beforeEachFns.push(fn);
};

const runSuite = async (suite: Suite, parentName = '', parentBefore: TestFn[] = []): Promise<number> => {
  const fullName = suite.name ? `${parentName}${suite.name} ` : parentName;
  const beforeFns = [...parentBefore, ...suite.beforeEachFns];
  let failures = 0;

  for (const test of suite.tests) {
    try {
      for (const hook of beforeFns) {
        await hook();
      }
      await test.fn();
      console.log(`✔ ${fullName}${test.name}`);
    } catch (error) {
      failures += 1;
      console.error(`✖ ${fullName}${test.name}`);
      console.error(error instanceof Error ? error.stack ?? error.message : error);
    }
  }

  for (const child of suite.children) {
    failures += await runSuite(child, fullName, beforeFns);
  }

  return failures;
};

export const run = async (): Promise<void> => {
  const failures = await runSuite(rootSuite);
  if (failures > 0) {
    process.exitCode = 1;
  }
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const matchObject = (actual: unknown, expected: Record<string, unknown>): void => {
  if (!isObject(actual)) {
    throw new assert.AssertionError({
      message: 'Expected value to be an object',
      actual,
      expected
    });
  }

  for (const [key, value] of Object.entries(expected)) {
    if (isObject(value)) {
      matchObject(actual[key], value as Record<string, unknown>);
    } else {
      assert.deepStrictEqual(actual[key], value);
    }
  }
};

export const expect = (actual: unknown) => ({
  toBe(expected: unknown) {
    assert.strictEqual(actual, expected);
  },
  toEqual(expected: unknown) {
    assert.deepStrictEqual(actual, expected);
  },
  toMatchObject(expected: Record<string, unknown>) {
    matchObject(actual, expected);
  },
  toBeCloseTo(expected: number, precision = 2) {
    if (typeof actual !== 'number') {
      throw new assert.AssertionError({
        message: 'Actual value is not a number',
        actual,
        expected
      });
    }
    const diff = Math.abs(actual - expected);
    const threshold = Math.pow(10, -precision) / 2;
    assert.ok(diff <= threshold, `Expected ${actual} to be within ${threshold} of ${expected}`);
  }
});
