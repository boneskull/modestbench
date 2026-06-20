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
  context: Record<string, unknown>;
  deepEqual: (actual: unknown, expected: unknown, message?: string) => void;
  fail: (message?: string) => void;
  false: (value: unknown, message?: string) => void;
  falsy: (value: unknown, message?: string) => void;
  is: (actual: unknown, expected: unknown, message?: string) => void;
  like: (actual: unknown, selector: unknown, message?: string) => void;
  log: (...values: unknown[]) => void;
  not: (actual: unknown, expected: unknown, message?: string) => void;
  notDeepEqual: (actual: unknown, expected: unknown, message?: string) => void;
  notRegex: (contents: string, regex: RegExp, message?: string) => void;
  notThrows: (fn: () => unknown, message?: string) => void;
  notThrowsAsync: (
    fn: () => Promise<unknown>,
    message?: string,
  ) => Promise<void>;
  pass: (message?: string) => void;
  plan: (count: number) => void;
  regex: (contents: string, regex: RegExp, message?: string) => void;
  snapshot: (expected: unknown, message?: string) => void;
  teardown: (fn: () => Promise<void> | void) => void;
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
  timeout: (ms: number, message?: string) => void;
  true: (value: unknown, message?: string) => void;
  truthy: (value: unknown, message?: string) => void;
  try: (
    ...args: unknown[]
  ) => Promise<{ commit: () => void; discard: () => void; passed: boolean }>;
}

/**
 * AVA macro type - can be a function or object with exec/title
 */
interface AvaMacro {
  exec: AvaTestFn;
  title?: (providedTitle: string | undefined, ...args: unknown[]) => string;
}

/**
 * AVA test function type
 */
type AvaTestFn = (
  t: AvaExecutionContext,
  ...args: unknown[]
) => Promise<void> | void;

/**
 * Check if a value is an AVA macro object (has exec property)
 */
const isMacroObject = (value: unknown): value is AvaMacro => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'exec' in value &&
    typeof (value as AvaMacro).exec === 'function'
  );
};

/**
 * Check if a value is a function (macro or test function)
 */
const isFunction = (value: unknown): value is AvaTestFn => {
  return typeof value === 'function';
};

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
 * with our loader: node --import modestbench/ava your-test.js
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
    context: {},
    deepEqual: noop,
    fail: noop,
    false: noop,
    falsy: noop,
    is: noop,
    like: noop,
    log: noop,
    not: noop,
    notDeepEqual: noop,
    notRegex: noop,
    notThrows: noop,
    notThrowsAsync: noopAsync,
    pass: noop,
    plan: noop,
    regex: noop,
    snapshot: noop,
    teardown: noop,
    throws: () => undefined,
    throwsAsync: noopAsync,
    timeout: noop,
    true: noop,
    truthy: noop,
    try: async () => ({ commit: noop, discard: noop, passed: true }),
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
  /**
   * Parse test arguments and return name + wrapped function Used by
   * registerTest and test variants (only, serial, skip)
   */
  const parseTestArgs = (
    titleOrMacroOrFn: AvaMacro | AvaTestFn | string,
    rest: unknown[],
  ): { name: string; wrappedFn: () => Promise<void> } => {
    let name: string;
    let fn: AvaTestFn;
    let args: unknown[] = [];

    if (typeof titleOrMacroOrFn === 'string') {
      name = titleOrMacroOrFn;
      const [macroOrFn, ...restArgs] = rest;

      if (isMacroObject(macroOrFn)) {
        fn = macroOrFn.exec;
        args = restArgs;
        if (macroOrFn.title) {
          name = macroOrFn.title(titleOrMacroOrFn, ...restArgs);
        }
      } else if (isFunction(macroOrFn)) {
        fn = macroOrFn;
        args = restArgs;
      } else {
        fn = () => {};
      }
    } else if (isMacroObject(titleOrMacroOrFn)) {
      fn = titleOrMacroOrFn.exec;
      args = rest;
      name = titleOrMacroOrFn.title
        ? titleOrMacroOrFn.title(undefined, ...rest)
        : fn.name || 'unnamed test';
    } else if (isFunction(titleOrMacroOrFn)) {
      fn = titleOrMacroOrFn;
      args = rest;
      name = fn.name || 'unnamed test';
    } else {
      name = 'unnamed test';
      fn = () => {};
    }

    const wrappedFn = async () => {
      const ctx = createMockContext();
      await fn(ctx, ...args);
    };

    return { name, wrappedFn };
  };

  /**
   * Process a test registration, handling all AVA calling conventions:
   *
   * - Test('title', fn)
   * - Test('title', macro, ...args)
   * - Test(macro, ...args)
   * - Test(fn)
   */
  const registerTest = (
    titleOrMacroOrFn: AvaMacro | AvaTestFn | string,
    ...rest: unknown[]
  ): void => {
    const { name, wrappedFn } = parseTestArgs(titleOrMacroOrFn, rest);
    state.tests.push({
      fn: wrappedFn,
      name,
    });
  };

  // Create mock test function
  const mockTest = Object.assign(registerTest, {
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

    // test.macro() - create reusable test macro
    // Accepts either a function or an object with exec/title
    macro: function macro<Args extends unknown[]>(
      fnOrObject:
        | ((t: AvaExecutionContext, ...args: Args) => Promise<void> | void)
        | {
            exec: (
              t: AvaExecutionContext,
              ...args: Args
            ) => Promise<void> | void;
            title?: (
              providedTitle: string | undefined,
              ...args: Args
            ) => string;
          },
    ): AvaMacro | AvaTestFn {
      if (typeof fnOrObject === 'function') {
        // Simple function macro - return as-is
        return fnOrObject as AvaTestFn;
      }
      // Object macro with exec/title - return as AvaMacro
      return {
        exec: fnOrObject.exec as AvaTestFn,
        title: fnOrObject.title as AvaMacro['title'],
      };
    },

    // test.only() - marks test as exclusive
    only: function only(
      titleOrMacroOrFn: AvaMacro | AvaTestFn | string,
      ...rest: unknown[]
    ): void {
      // Reuse registerTest logic but add only flag
      const { name, wrappedFn } = parseTestArgs(titleOrMacroOrFn, rest);
      state.tests.push({
        fn: wrappedFn,
        name,
        only: true,
      });
    },

    // test.serial() - run serially (we capture but ignore serial flag for benchmarks)
    serial: function serial(
      titleOrMacroOrFn: AvaMacro | AvaTestFn | string,
      ...rest: unknown[]
    ): void {
      const { name, wrappedFn } = parseTestArgs(titleOrMacroOrFn, rest);
      state.tests.push({
        fn: wrappedFn,
        name,
        serial: true,
      });
    },

    // test.skip() - marks test as skipped
    skip: function skip(
      titleOrMacroOrFn: AvaMacro | AvaTestFn | string,
      ...rest: unknown[]
    ): void {
      const { name, wrappedFn } = parseTestArgs(titleOrMacroOrFn, rest);
      state.tests.push({
        fn: wrappedFn,
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
  });

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
