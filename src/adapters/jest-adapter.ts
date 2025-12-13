/**
 * ModestBench Jest Adapter
 *
 * Captures test definitions from Jest test files using ES module loader hooks.
 *
 * Jest differs from AVA and node:test in important ways:
 *
 * - Nested describe blocks: describe() callbacks execute IMMEDIATELY during file
 *   load to discover nested tests. We must run describe callbacks but NOT test
 *   functions.
 * - Rich API surface: .skip, .only, .each, .todo, .concurrent, .failing modifiers
 * - Jest object: Tests may access jest.fn(), jest.mock(), etc.
 * - Expect assertions: Tests use expect() for assertions
 *
 * Architecture:
 *
 * 1. Install mock on globalThis
 * 2. Loader intercepts '@jest/globals' imports and returns the mock
 * 3. Import test file - describe callbacks execute, test functions are captured
 * 4. Return captured test structure
 */

import { pathToFileURL } from 'node:url';

import type {
  CapturedSuite,
  CapturedTest,
  CapturedTestFile,
  SuiteHooks,
  TestFrameworkAdapter,
} from './types.js';

/**
 * Global capture state key
 */
const CAPTURE_STATE_KEY = '__MODESTBENCH_JEST_CAPTURE__';

/**
 * Internal capture state structure
 *
 * Uses a stack to track nested describe blocks
 */
interface CaptureState {
  rootSuite: MutableCapturedSuite;
  suiteStack: MutableCapturedSuite[];
}

/**
 * Jest's each table type for parameterized tests
 */
type EachTable = ReadonlyArray<readonly unknown[]> | readonly unknown[];

/**
 * Jest's test function type
 */
type JestTestFn = () => Promise<void> | void;

/**
 * Internal captured suite with Jest-specific data
 */
interface MutableCapturedSuite {
  children: MutableCapturedSuite[];
  hooks: {
    afterAll: Array<{ fn: JestTestFn; timeout?: number }>;
    afterEach: Array<{ fn: JestTestFn; timeout?: number }>;
    beforeAll: Array<{ fn: JestTestFn; timeout?: number }>;
    beforeEach: Array<{ fn: JestTestFn; timeout?: number }>;
  };
  name: string;
  only?: boolean;
  skip?: boolean;
  tests: MutableCapturedTest[];
}

/**
 * Internal captured test with Jest-specific flags
 */
interface MutableCapturedTest {
  fn: JestTestFn;
  name: string;
  only?: boolean;
  skip?: boolean;
  timeout?: number;
}

/**
 * Get the current suite from the stack
 */
const getCurrentSuite = (state: CaptureState): MutableCapturedSuite => {
  return state.suiteStack[state.suiteStack.length - 1] ?? state.rootSuite;
};

/**
 * Jest test framework adapter
 *
 * Captures test definitions by installing mock implementations before importing
 * the test file.
 *
 * IMPORTANT: For this to work with Jest imports, you must run Node.js with our
 * loader: node --import modestbench/jest your-test.js
 */
export class JestAdapter implements TestFrameworkAdapter {
  readonly framework = 'jest' as const;

  /**
   * Capture test definitions from a Jest test file
   *
   * @param filePath - Absolute path to the test file
   * @returns Captured test structure
   */
  async capture(filePath: string): Promise<CapturedTestFile> {
    // Initialize capture state
    const state = initCaptureState();

    // Install mocks
    installJestMocks(state);

    try {
      // Import the test file
      // The loader hook will intercept '@jest/globals' and use our mocks
      // Describe callbacks will execute immediately, capturing the test structure
      const fileUrl = pathToFileURL(filePath).href;
      const bustCache = `?t=${Date.now()}`;
      await import(fileUrl + bustCache);

      // Return captured structure
      return toCapturedTestFile(state, filePath);
    } finally {
      // Clean up
      uninstallJestMocks();
      clearCaptureState();
    }
  }
}

/**
 * Clear capture state from globalThis
 */
const clearCaptureState = (): void => {
  // @ts-expect-error - intentionally using globalThis
  delete globalThis[CAPTURE_STATE_KEY];
};

/**
 * Create a mock expect function
 *
 * Jest's expect() returns an object with assertion methods. We provide a stub
 * that allows tests to call expect() without errors during structure capture.
 * Since we capture but don't execute test functions, this is mainly for
 * safety.
 */
const createMockExpect = (): ((value: unknown) => unknown) => {
  const noop = () => mockExpect;
  const noopAsync = () => Promise.resolve(mockExpect);

  // Chainable assertion mock
  const assertionChain: Record<string, unknown> = {
    not: {} as Record<string, unknown>,
    rejects: {} as Record<string, unknown>,
    resolves: {} as Record<string, unknown>,
  };

  // Common matchers - all return the chain for further chaining
  const matchers = [
    'toBe',
    'toEqual',
    'toStrictEqual',
    'toBeNull',
    'toBeUndefined',
    'toBeDefined',
    'toBeTruthy',
    'toBeFalsy',
    'toBeNaN',
    'toContain',
    'toContainEqual',
    'toHaveLength',
    'toHaveProperty',
    'toMatch',
    'toMatchObject',
    'toMatchSnapshot',
    'toMatchInlineSnapshot',
    'toThrow',
    'toThrowError',
    'toThrowErrorMatchingSnapshot',
    'toThrowErrorMatchingInlineSnapshot',
    'toBeGreaterThan',
    'toBeGreaterThanOrEqual',
    'toBeLessThan',
    'toBeLessThanOrEqual',
    'toBeCloseTo',
    'toBeInstanceOf',
    'toHaveBeenCalled',
    'toHaveBeenCalledTimes',
    'toHaveBeenCalledWith',
    'toHaveBeenLastCalledWith',
    'toHaveBeenNthCalledWith',
    'toHaveReturned',
    'toHaveReturnedTimes',
    'toHaveReturnedWith',
    'toHaveLastReturnedWith',
    'toHaveNthReturnedWith',
  ];

  for (const matcher of matchers) {
    assertionChain[matcher] = noop;
    (assertionChain.not as Record<string, unknown>)[matcher] = noop;
    (assertionChain.resolves as Record<string, unknown>)[matcher] = noopAsync;
    (assertionChain.rejects as Record<string, unknown>)[matcher] = noopAsync;
  }

  const mockExpect = (_value: unknown) => assertionChain;

  // Static expect methods
  Object.assign(mockExpect, {
    addSnapshotSerializer: noop,
    any: noop,
    anything: noop,
    arrayContaining: noop,
    assertions: noop,
    closeTo: noop,
    extend: noop,
    getState: () => ({}),
    hasAssertions: noop,
    not: {
      arrayContaining: noop,
      objectContaining: noop,
      stringContaining: noop,
      stringMatching: noop,
    },
    objectContaining: noop,
    setState: noop,
    stringContaining: noop,
    stringMatching: noop,
  });

  return mockExpect;
};

/**
 * Create a mock jest object
 *
 * Provides stub implementations of common jest.* utilities that tests might
 * call during structure capture. Since we don't execute test functions, most of
 * these won't be called, but they're here for safety.
 */
const createMockJestObject = (): Record<string, unknown> => {
  const noop = () => {};
  const noopReturnsThis = function (this: unknown) {
    return this;
  };

  // Mock function factory
  const mockFn = (implementation?: unknown) => {
    const fn = typeof implementation === 'function' ? implementation : noop;
    return Object.assign(fn, {
      mock: { calls: [], instances: [], results: [] },
      mockClear: noopReturnsThis,
      mockImplementation: noopReturnsThis,
      mockImplementationOnce: noopReturnsThis,
      mockName: noopReturnsThis,
      mockRejectedValue: noopReturnsThis,
      mockRejectedValueOnce: noopReturnsThis,
      mockReset: noopReturnsThis,
      mockResolvedValue: noopReturnsThis,
      mockResolvedValueOnce: noopReturnsThis,
      mockRestore: noopReturnsThis,
      mockReturnThis: noopReturnsThis,
      mockReturnValue: noopReturnsThis,
      mockReturnValueOnce: noopReturnsThis,
    });
  };

  return {
    advanceTimersByTime: noop,
    advanceTimersByTimeAsync: () => Promise.resolve(),
    advanceTimersToNextTimer: noop,
    advanceTimersToNextTimerAsync: () => Promise.resolve(),
    autoMockOff: noopReturnsThis,
    autoMockOn: noopReturnsThis,
    clearAllMocks: noop,
    clearAllTimers: noop,
    createMockFromModule: () => ({}),
    deepUnmock: noopReturnsThis,
    disableAutomock: noopReturnsThis,
    doMock: noop,
    dontMock: noopReturnsThis,
    enableAutomock: noopReturnsThis,
    fn: mockFn,
    genMockFromModule: () => ({}),
    getRealSystemTime: () => Date.now(),
    getSeed: () => 0,
    getTimerCount: () => 0,
    isEnvironmentTornDown: () => false,
    isMockFunction: () => false,
    isolateModules: noop,
    isolateModulesAsync: () => Promise.resolve(),
    mock: noop,
    mocked: (source: unknown) => source,
    now: () => Date.now(),
    replaceProperty: noopReturnsThis,
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return -- Mimics Jest's requireActual API
    requireActual: (moduleName: string) => require(moduleName),
    requireMock: () => ({}),
    resetAllMocks: noop,
    resetModules: noopReturnsThis,
    restoreAllMocks: noop,
    retryTimes: noopReturnsThis,
    runAllImmediates: noop,
    runAllTicks: noop,
    runAllTimers: noop,
    runAllTimersAsync: () => Promise.resolve(),
    runOnlyPendingTimers: noop,
    runOnlyPendingTimersAsync: () => Promise.resolve(),
    setMock: noopReturnsThis,
    setSystemTime: noop,
    setTimeout: noopReturnsThis,
    spyOn: () => mockFn(),
    unmock: noopReturnsThis,
    unstable_mockModule: noop,
    useFakeTimers: noopReturnsThis,
    useRealTimers: noopReturnsThis,
  };
};

/**
 * Initialize capture state on globalThis
 */
const initCaptureState = (): CaptureState => {
  const rootSuite: MutableCapturedSuite = {
    children: [],
    hooks: {
      afterAll: [],
      afterEach: [],
      beforeAll: [],
      beforeEach: [],
    },
    name: '',
    tests: [],
  };

  const state: CaptureState = {
    rootSuite,
    suiteStack: [rootSuite],
  };

  // @ts-expect-error - intentionally using globalThis for cross-module state
  globalThis[CAPTURE_STATE_KEY] = state;

  return state;
};

/**
 * Install Jest mocks on globalThis for module interception
 */
const installJestMocks = (state: CaptureState): void => {
  const mockExpect = createMockExpect();
  const mockJest = createMockJestObject();

  /**
   * Create a describe function implementation
   */
  const makeDescribeFn =
    (options: { only?: boolean; skip?: boolean } = {}) =>
    (name: string, fn: () => void): void => {
      const suite: MutableCapturedSuite = {
        children: [],
        hooks: {
          afterAll: [],
          afterEach: [],
          beforeAll: [],
          beforeEach: [],
        },
        name,
        only: options.only,
        skip: options.skip,
        tests: [],
      };

      const currentSuite = getCurrentSuite(state);
      currentSuite.children.push(suite);

      // Push onto stack, execute callback to discover nested tests, then pop
      state.suiteStack.push(suite);
      try {
        fn(); // Execute describe callback to discover nested content
      } finally {
        state.suiteStack.pop();
      }
    };

  /**
   * Create a test function implementation
   */
  const makeTestFn =
    (options: { only?: boolean; skip?: boolean } = {}) =>
    (name: string, fn?: JestTestFn, timeout?: number): void => {
      const currentSuite = getCurrentSuite(state);
      currentSuite.tests.push({
        fn: fn ?? (() => {}),
        name,
        only: options.only,
        skip: options.skip,
        timeout,
      });
    };

  // Create base describe function with modifiers
  const describeFn = makeDescribeFn();
  const describeOnly = makeDescribeFn({ only: true });
  const describeSkip = makeDescribeFn({ skip: true });

  const mockDescribe = Object.assign(describeFn, {
    each:
      (table: EachTable) =>
      (nameTemplate: string, fn: (...args: unknown[]) => void): void => {
        // Handle both array of arrays and template literal tagged syntax
        const rows = Array.isArray(table[0]) ? table : [table];
        for (const row of rows as readonly unknown[][]) {
          // Simple template substitution for %s, %i, %d, %p, %j, etc.
          let name = nameTemplate;
          for (let i = 0; i < row.length; i++) {
            name = name.replace(/%[sidpjfo#]/i, String(row[i]));
          }
          describeFn(name, () => fn(...row));
        }
      },
    only: describeOnly,
    skip: describeSkip,
  });

  // Create base test function with modifiers
  const testFn = makeTestFn();
  const testOnly = makeTestFn({ only: true });
  const testSkip = makeTestFn({ skip: true });

  const mockTest = Object.assign(testFn, {
    concurrent: (name: string, fn: JestTestFn, timeout?: number): void => {
      // Treat concurrent tests as regular tests for benchmarking
      testFn(name, fn, timeout);
    },
    each:
      (table: EachTable) =>
      (
        nameTemplate: string,
        fn: (...args: unknown[]) => Promise<void> | void,
        timeout?: number,
      ): void => {
        const rows = Array.isArray(table[0]) ? table : [table];
        for (const row of rows as readonly unknown[][]) {
          let name = nameTemplate;
          for (let i = 0; i < row.length; i++) {
            name = name.replace(/%[sidpjfo#]/i, String(row[i]));
          }
          testFn(name, () => fn(...row), timeout);
        }
      },
    failing: (name: string, fn: JestTestFn, timeout?: number): void => {
      // Treat failing tests as regular tests for benchmarking
      testFn(name, fn, timeout);
    },
    only: testOnly,
    skip: testSkip,
    todo: (name: string): void => {
      const currentSuite = getCurrentSuite(state);
      currentSuite.tests.push({
        fn: () => {},
        name,
        skip: true,
      });
    },
  });

  // Hook registration helpers
  const createHook =
    (hookType: 'afterAll' | 'afterEach' | 'beforeAll' | 'beforeEach') =>
    (fn: JestTestFn, timeout?: number): void => {
      const currentSuite = getCurrentSuite(state);
      currentSuite.hooks[hookType].push({ fn, timeout });
    };

  // Install on globalThis for the loader to access
  // @ts-expect-error - intentionally using globalThis
  globalThis.__MODESTBENCH_JEST_MOCK__ = {
    afterAll: createHook('afterAll'),
    afterEach: createHook('afterEach'),
    beforeAll: createHook('beforeAll'),
    beforeEach: createHook('beforeEach'),
    describe: mockDescribe,
    expect: mockExpect,
    fdescribe: mockDescribe.only,
    fit: mockTest.only,
    it: mockTest,
    jest: mockJest,
    test: mockTest,
    xdescribe: mockDescribe.skip,
    xit: mockTest.skip,
    xtest: mockTest.skip,
  };
};

/**
 * Convert a mutable suite to the captured format
 */
const convertSuite = (suite: MutableCapturedSuite): CapturedSuite => {
  const hooks: SuiteHooks = {
    after: suite.hooks.afterAll.map((h) => h.fn),
    afterEach: suite.hooks.afterEach.map((h) => h.fn),
    before: suite.hooks.beforeAll.map((h) => h.fn),
    beforeEach: suite.hooks.beforeEach.map((h) => h.fn),
  };

  const tests: CapturedTest[] = suite.tests.map((t) => ({
    fn: t.fn,
    name: t.name,
    only: t.only,
    skip: t.skip,
  }));

  return {
    children: suite.children.map(convertSuite),
    hooks,
    name: suite.name,
    only: suite.only,
    skip: suite.skip,
    tests,
  };
};

/**
 * Convert capture state to CapturedTestFile
 */
const toCapturedTestFile = (
  state: CaptureState,
  filePath: string,
): CapturedTestFile => {
  const root = state.rootSuite;

  // Root-level tests (not in any describe block)
  const rootTests: CapturedTest[] = root.tests.map((t) => ({
    fn: t.fn,
    name: t.name,
    only: t.only,
    skip: t.skip,
  }));

  // Convert child suites
  const rootSuites = root.children.map(convertSuite);

  return {
    filePath,
    framework: 'jest',
    rootSuites,
    rootTests,
  };
};

/**
 * Uninstall Jest mocks
 */
const uninstallJestMocks = (): void => {
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.__MODESTBENCH_JEST_MOCK__;
};
