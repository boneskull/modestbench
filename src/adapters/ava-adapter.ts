/**
 * ModestBench AVA Adapter
 *
 * Captures test definitions from AVA test files using ES module loader hooks.
 *
 * AVA differs from Mocha and node:test:
 *
 * - No describe blocks - tests are flat
 * - Tests receive an execution context `t` with assertions
 * - Supports test.before/after/beforeEach/afterEach at file level
 * - Each test file is isolated (we don't need to handle that)
 *
 * Architecture:
 *
 * 1. Install mock on globalThis
 * 2. Loader intercepts 'ava' imports and returns the mock
 * 3. Import test file to capture test definitions
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
const CAPTURE_STATE_KEY = '__MODESTBENCH_AVA_CAPTURE__';

/**
 * AVA's test execution context (simplified mock)
 *
 * Real AVA passes a context object with assertions. We provide a minimal mock
 * that allows tests to run without crashing.
 */
interface AvaExecutionContext {
  assert: (value: unknown, message?: string) => void;
  deepEqual: (actual: unknown, expected: unknown, message?: string) => void;
  fail: (message?: string) => void;
  false: (value: unknown, message?: string) => void;
  falsy: (value: unknown, message?: string) => void;
  is: (actual: unknown, expected: unknown, message?: string) => void;
  not: (actual: unknown, expected: unknown, message?: string) => void;
  notDeepEqual: (actual: unknown, expected: unknown, message?: string) => void;
  notThrows: (fn: () => unknown, message?: string) => void;
  notThrowsAsync: (
    fn: () => Promise<unknown>,
    message?: string,
  ) => Promise<void>;
  pass: (message?: string) => void;
  plan: (count: number) => void;
  regex: (contents: string, regex: RegExp, message?: string) => void;
  snapshot: (expected: unknown, message?: string) => void;
  throws: (
    fn: () => unknown,
    expectations?: unknown,
    message?: string,
  ) => unknown;
  throwsAsync: (
    fn: () => Promise<unknown>,
    expectations?: unknown,
    message?: string,
  ) => Promise<unknown>;
  true: (value: unknown, message?: string) => void;
  truthy: (value: unknown, message?: string) => void;
}

/**
 * AVA test function type
 */
type AvaTestFn = (t: AvaExecutionContext) => Promise<void> | void;

/**
 * Internal capture state structure
 *
 * AVA doesn't have suites, so we capture everything as root-level tests with
 * file-level hooks stored separately
 */
interface CaptureState {
  hooks: {
    after: Array<() => Promise<void> | void>;
    afterAlways: Array<() => Promise<void> | void>;
    afterEach: Array<() => Promise<void> | void>;
    afterEachAlways: Array<() => Promise<void> | void>;
    before: Array<() => Promise<void> | void>;
    beforeEach: Array<() => Promise<void> | void>;
  };
  tests: MutableCapturedTest[];
}

/**
 * Mutable version of CapturedTest
 */
interface MutableCapturedTest {
  fn: (t: AvaExecutionContext) => Promise<void> | void;
  name: string;
  only?: boolean;
  serial?: boolean;
  skip?: boolean;
}

/**
 * AVA test framework adapter
 *
 * Captures test definitions by installing mock implementations before importing
 * the test file.
 *
 * IMPORTANT: For this to work with actual AVA imports, you must run Node.js
 * with our loader: node --import modestbench/adapters/ava-loader.mjs
 * your-test.js
 */
export class AvaAdapter implements TestFrameworkAdapter {
  readonly framework = 'ava' as const;

  /**
   * Capture test definitions from an AVA test file
   *
   * @param filePath - Absolute path to the test file
   * @returns Captured test structure
   */
  async capture(filePath: string): Promise<CapturedTestFile> {
    // Initialize capture state
    const state = initCaptureState();

    // Install mocks
    installAvaMocks(state);

    try {
      // Import the test file
      // The loader hook will intercept 'ava' and use our mocks
      const fileUrl = pathToFileURL(filePath).href;
      const bustCache = `?t=${Date.now()}`;
      await import(fileUrl + bustCache);

      // Return captured structure
      return toCapturedTestFile(state, filePath);
    } finally {
      // Clean up
      uninstallAvaMocks();
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
 * Create a mock AVA execution context
 *
 * This allows test functions to call t.is(), t.pass(), etc. without errors
 * during benchmarking. We're measuring performance, not correctness.
 */
const createMockContext = (): AvaExecutionContext => {
  const noop = () => {};
  const noopAsync = () => Promise.resolve();

  return {
    assert: noop,
    deepEqual: noop,
    fail: noop,
    false: noop,
    falsy: noop,
    is: noop,
    not: noop,
    notDeepEqual: noop,
    notThrows: noop,
    notThrowsAsync: noopAsync,
    pass: noop,
    plan: noop,
    regex: noop,
    snapshot: noop,
    throws: () => undefined,
    throwsAsync: noopAsync as () => Promise<unknown>,
    true: noop,
    truthy: noop,
  };
};

/**
 * Initialize capture state on globalThis
 */
const initCaptureState = (): CaptureState => {
  const state: CaptureState = {
    hooks: {
      after: [],
      afterAlways: [],
      afterEach: [],
      afterEachAlways: [],
      before: [],
      beforeEach: [],
    },
    tests: [],
  };

  // @ts-expect-error - intentionally using globalThis for cross-module state
  globalThis[CAPTURE_STATE_KEY] = state;

  return state;
};

/**
 * Install AVA mocks on globalThis for module interception
 */
const installAvaMocks = (state: CaptureState): void => {
  // Create mock test function
  const mockTest = Object.assign(
    (titleOrMacro: AvaTestFn | string, implementation?: AvaTestFn): void => {
      let name: string;
      let fn: AvaTestFn;

      if (typeof titleOrMacro === 'string') {
        name = titleOrMacro;
        fn = implementation ?? (() => {});
      } else {
        // Macro without title - use function name or 'unnamed'
        name = titleOrMacro.name || 'unnamed test';
        fn = titleOrMacro;
      }

      // Wrap the AVA test function to inject mock context
      const wrappedFn = async () => {
        const ctx = createMockContext();
        await fn(ctx);
      };

      state.tests.push({
        fn: wrappedFn as unknown as (
          t: AvaExecutionContext,
        ) => Promise<void> | void,
        name,
      });
    },
    {
      // test.after() - runs once after all tests
      after: Object.assign(
        (fn: AvaTestFn): void => {
          const wrappedFn = async () => {
            const ctx = createMockContext();
            await fn(ctx);
          };
          state.hooks.after.push(wrappedFn);
        },
        {
          // test.after.always() - runs even if tests fail
          always: function always(fn: AvaTestFn): void {
            const wrappedFn = async () => {
              const ctx = createMockContext();
              await fn(ctx);
            };
            state.hooks.afterAlways.push(wrappedFn);
          },
        },
      ),

      // test.afterEach() - runs after each test
      afterEach: Object.assign(
        (fn: AvaTestFn): void => {
          const wrappedFn = async () => {
            const ctx = createMockContext();
            await fn(ctx);
          };
          state.hooks.afterEach.push(wrappedFn);
        },
        {
          // test.afterEach.always() - runs even if test fails
          always: function always(fn: AvaTestFn): void {
            const wrappedFn = async () => {
              const ctx = createMockContext();
              await fn(ctx);
            };
            state.hooks.afterEachAlways.push(wrappedFn);
          },
        },
      ),

      // test.before() - runs once before all tests
      before: function before(fn: AvaTestFn): void {
        const wrappedFn = async () => {
          const ctx = createMockContext();
          await fn(ctx);
        };
        state.hooks.before.push(wrappedFn);
      },

      // test.beforeEach() - runs before each test
      beforeEach: function beforeEach(fn: AvaTestFn): void {
        const wrappedFn = async () => {
          const ctx = createMockContext();
          await fn(ctx);
        };
        state.hooks.beforeEach.push(wrappedFn);
      },

      // test.failing() - expected to fail (treat as regular for benchmarks)
      failing: function failing(
        titleOrMacro: AvaTestFn | string,
        implementation?: AvaTestFn,
      ): void {
        mockTest(titleOrMacro, implementation);
      },

      // test.macro() - create reusable test macro (stub)
      macro: function macro<Args extends unknown[]>(
        fn: (t: AvaExecutionContext, ...args: Args) => Promise<void> | void,
      ) {
        return fn;
      },

      // test.only() - marks test as exclusive
      only: function only(
        titleOrMacro: AvaTestFn | string,
        implementation?: AvaTestFn,
      ): void {
        let name: string;
        let fn: AvaTestFn;

        if (typeof titleOrMacro === 'string') {
          name = titleOrMacro;
          fn = implementation ?? (() => {});
        } else {
          name = titleOrMacro.name || 'unnamed test';
          fn = titleOrMacro;
        }

        const wrappedFn = async () => {
          const ctx = createMockContext();
          await fn(ctx);
        };

        state.tests.push({
          fn: wrappedFn as unknown as (
            t: AvaExecutionContext,
          ) => Promise<void> | void,
          name,
          only: true,
        });
      },

      // test.serial() - run serially (we capture but ignore serial flag for benchmarks)
      serial: function serial(
        titleOrMacro: AvaTestFn | string,
        implementation?: AvaTestFn,
      ): void {
        let name: string;
        let fn: AvaTestFn;

        if (typeof titleOrMacro === 'string') {
          name = titleOrMacro;
          fn = implementation ?? (() => {});
        } else {
          name = titleOrMacro.name || 'unnamed test';
          fn = titleOrMacro;
        }

        const wrappedFn = async () => {
          const ctx = createMockContext();
          await fn(ctx);
        };

        state.tests.push({
          fn: wrappedFn as unknown as (
            t: AvaExecutionContext,
          ) => Promise<void> | void,
          name,
          serial: true,
        });
      },

      // test.skip() - marks test as skipped
      skip: function skip(
        titleOrMacro: AvaTestFn | string,
        implementation?: AvaTestFn,
      ): void {
        let name: string;
        let fn: AvaTestFn;

        if (typeof titleOrMacro === 'string') {
          name = titleOrMacro;
          fn = implementation ?? (() => {});
        } else {
          name = titleOrMacro.name || 'unnamed test';
          fn = titleOrMacro;
        }

        const wrappedFn = async () => {
          const ctx = createMockContext();
          await fn(ctx);
        };

        state.tests.push({
          fn: wrappedFn as unknown as (
            t: AvaExecutionContext,
          ) => Promise<void> | void,
          name,
          skip: true,
        });
      },

      // test.todo() - placeholder test
      todo: function todo(title: string): void {
        state.tests.push({
          fn: () => {},
          name: title,
          skip: true,
        });
      },
    },
  );

  // Install on globalThis for the loader to access
  // @ts-expect-error - intentionally using globalThis
  globalThis.__MODESTBENCH_AVA_MOCK__ = {
    default: mockTest,
    test: mockTest,
  };
};

/**
 * Convert capture state to CapturedTestFile
 *
 * Since AVA doesn't have suites, we create a synthetic "default" suite to hold
 * the file-level hooks and tests.
 */
const toCapturedTestFile = (
  state: CaptureState,
  filePath: string,
): CapturedTestFile => {
  // Combine after and afterAlways, afterEach and afterEachAlways
  const combinedHooks: SuiteHooks = {
    after: [...state.hooks.after, ...state.hooks.afterAlways],
    afterEach: [...state.hooks.afterEach, ...state.hooks.afterEachAlways],
    before: state.hooks.before,
    beforeEach: state.hooks.beforeEach,
  };

  // Convert tests
  const tests: CapturedTest[] = state.tests.map((t) => ({
    fn: t.fn as unknown as () => Promise<void> | void,
    name: t.name,
    only: t.only,
    skip: t.skip,
  }));

  // If there are hooks, wrap them in a synthetic suite
  const hasHooks =
    combinedHooks.before.length > 0 ||
    combinedHooks.after.length > 0 ||
    combinedHooks.beforeEach.length > 0 ||
    combinedHooks.afterEach.length > 0;

  if (hasHooks) {
    // Create a synthetic suite to hold hooks
    const suite: CapturedSuite = {
      children: [],
      hooks: combinedHooks,
      name: 'default',
      tests,
    };

    return {
      filePath,
      framework: 'ava',
      rootSuites: [suite],
      rootTests: [],
    };
  }

  // No hooks - just return flat tests
  return {
    filePath,
    framework: 'ava',
    rootSuites: [],
    rootTests: tests,
  };
};

/**
 * Uninstall AVA mocks
 */
const uninstallAvaMocks = (): void => {
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.__MODESTBENCH_AVA_MOCK__;
};
