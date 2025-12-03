/**
 * ModestBench Node.js Test Runner Adapter
 *
 * Captures test definitions from node:test files using ES module loader hooks.
 *
 * Unlike Mocha (which uses globals), node:test requires ES module import
 * interception. We use Node.js module.register() API to install a custom loader
 * that returns our capturing mock instead of the real node:test.
 *
 * Architecture:
 *
 * 1. Register a custom loader that intercepts node:test imports
 * 2. Import the test file - this triggers test/describe calls
 * 3. Retrieve captured state from global storage
 * 4. Unregister the loader
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
const CAPTURE_STATE_KEY = '__MODESTBENCH_NODE_TEST_CAPTURE__';

/**
 * Internal capture state structure
 */
interface CaptureState {
  currentSuite: MutableCapturedSuite | null;
  rootSuites: MutableCapturedSuite[];
  rootTests: MutableCapturedTest[];
}

/**
 * Mutable version of CapturedSuite for building state
 */
interface MutableCapturedSuite {
  children: MutableCapturedSuite[];
  hooks: MutableSuiteHooks;
  name: string;
  tests: MutableCapturedTest[];
}

/**
 * Mutable version of CapturedTest
 */
interface MutableCapturedTest {
  fn: () => Promise<void> | void;
  name: string;
  only?: boolean;
  skip?: boolean;
}

/**
 * Mutable version of SuiteHooks
 */
interface MutableSuiteHooks {
  after: Array<() => Promise<void> | void>;
  afterEach: Array<() => Promise<void> | void>;
  before: Array<() => Promise<void> | void>;
  beforeEach: Array<() => Promise<void> | void>;
}

/**
 * Node.js test runner adapter
 *
 * Captures test definitions by installing mock implementations before importing
 * the test file.
 *
 * IMPORTANT: For this to work with actual node:test imports, you must run
 * Node.js with our loader: node --import
 * modestbench/adapters/node-test-loader.mjs your-test.js
 *
 * Without the loader, this adapter only works with test files that use
 * globalThis.**MODESTBENCH_NODE_TEST_MOCK** directly (not useful for real test
 * files).
 */
export class NodeTestAdapter implements TestFrameworkAdapter {
  readonly framework = 'node-test' as const;

  /**
   * Capture test definitions from a node:test file
   *
   * @param filePath - Absolute path to the test file
   * @returns Captured test structure
   */
  async capture(filePath: string): Promise<CapturedTestFile> {
    // Initialize capture state
    const state = initCaptureState();

    // Install mocks
    installNodeTestMocks(state);

    try {
      // Import the test file
      // The loader hook will intercept 'node:test' and use our mocks
      const fileUrl = pathToFileURL(filePath).href;
      const bustCache = `?t=${Date.now()}`;
      await import(fileUrl + bustCache);

      // Return captured structure
      return toCapturedTestFile(state, filePath);
    } finally {
      // Clean up
      uninstallNodeTestMocks();
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
 * Create empty hooks structure
 */
const createEmptyHooks = (): MutableSuiteHooks => {
  return {
    after: [],
    afterEach: [],
    before: [],
    beforeEach: [],
  };
};

/**
 * Create a new suite structure
 */
const createSuite = (name: string): MutableCapturedSuite => {
  return {
    children: [],
    hooks: createEmptyHooks(),
    name,
    tests: [],
  };
};

/**
 * Initialize capture state on globalThis
 */
const initCaptureState = (): CaptureState => {
  const state: CaptureState = {
    currentSuite: null,
    rootSuites: [],
    rootTests: [],
  };

  // @ts-expect-error - intentionally using globalThis for cross-module state
  globalThis[CAPTURE_STATE_KEY] = state;

  return state;
};

/**
 * Install node:test mocks on globalThis for module interception
 *
 * Since we can't truly intercept ES imports without a loader, we use a
 * workaround: install mocks that test files can import via a special path.
 *
 * For true node:test interception, users must run with: node --import
 * modestbench/register test-file.js
 */
const installNodeTestMocks = (state: CaptureState): void => {
  // Create mock test function
  const mockTest = Object.assign(
    (
      nameOrOptions: string | { name?: string; only?: boolean; skip?: boolean },
      fnOrOptions?:
        | (() => Promise<void> | void)
        | { only?: boolean; skip?: boolean },
      maybeFn?: () => Promise<void> | void,
    ): Promise<void> => {
      let name: string;
      let fn: () => Promise<void> | void;
      let skip = false;
      let only = false;

      // Parse arguments - node:test has flexible signatures
      if (typeof nameOrOptions === 'string') {
        name = nameOrOptions;
        if (typeof fnOrOptions === 'function') {
          fn = fnOrOptions;
        } else if (fnOrOptions && typeof fnOrOptions === 'object') {
          skip = fnOrOptions.skip ?? false;
          only = fnOrOptions.only ?? false;
          fn = maybeFn ?? (() => {});
        } else {
          fn = () => {};
        }
      } else {
        name = nameOrOptions.name ?? 'unnamed test';
        skip = nameOrOptions.skip ?? false;
        only = nameOrOptions.only ?? false;
        fn = (fnOrOptions as () => Promise<void> | void) ?? (() => {});
      }

      const test: MutableCapturedTest = { fn, name, only, skip };

      if (state.currentSuite) {
        state.currentSuite.tests.push(test);
      } else {
        state.rootTests.push(test);
      }

      return Promise.resolve();
    },
    {
      only: function only(
        name: string,
        fn?: () => Promise<void> | void,
      ): Promise<void> {
        return mockTest(name, { only: true }, fn);
      },
      skip: function skip(
        name: string,
        fn?: () => Promise<void> | void,
      ): Promise<void> {
        return mockTest(name, { skip: true }, fn);
      },
      todo: function todo(
        name: string,
        fn?: () => Promise<void> | void,
      ): Promise<void> {
        return mockTest(name, { skip: true }, fn);
      },
    },
  );

  // Create mock describe function
  const mockDescribe = Object.assign(
    (
      nameOrOptions: string | { name?: string; only?: boolean; skip?: boolean },
      fnOrOptions?: (() => void) | { only?: boolean; skip?: boolean },
      maybeFn?: () => void,
    ): Promise<void> => {
      let name: string;
      let fn: (() => void) | undefined;

      if (typeof nameOrOptions === 'string') {
        name = nameOrOptions;
        if (typeof fnOrOptions === 'function') {
          fn = fnOrOptions;
        } else {
          fn = maybeFn;
        }
      } else {
        name = nameOrOptions.name ?? 'unnamed suite';
        fn = fnOrOptions as (() => void) | undefined;
      }

      const suite = createSuite(name);
      const parent = state.currentSuite;

      if (parent) {
        parent.children.push(suite);
      } else {
        state.rootSuites.push(suite);
      }

      // Enter suite context
      state.currentSuite = suite;

      // Execute describe body
      if (fn) {
        fn();
      }

      // Exit back to parent
      state.currentSuite = parent;

      return Promise.resolve();
    },
    {
      only: function only(name: string, fn?: () => void): Promise<void> {
        return mockDescribe(name, fn);
      },
      skip: function skip(_name: string, _fn?: () => void): Promise<void> {
        return Promise.resolve();
      },
      todo: function todo(_name: string, _fn?: () => void): Promise<void> {
        return Promise.resolve();
      },
    },
  );

  // Hook functions
  const mockBefore = (fn: () => Promise<void> | void): void => {
    if (state.currentSuite) {
      state.currentSuite.hooks.before.push(fn);
    }
  };

  const mockAfter = (fn: () => Promise<void> | void): void => {
    if (state.currentSuite) {
      state.currentSuite.hooks.after.push(fn);
    }
  };

  const mockBeforeEach = (fn: () => Promise<void> | void): void => {
    if (state.currentSuite) {
      state.currentSuite.hooks.beforeEach.push(fn);
    }
  };

  const mockAfterEach = (fn: () => Promise<void> | void): void => {
    if (state.currentSuite) {
      state.currentSuite.hooks.afterEach.push(fn);
    }
  };

  // Install on globalThis for the loader to access
  // @ts-expect-error - intentionally using globalThis
  globalThis.__MODESTBENCH_NODE_TEST_MOCK__ = {
    after: mockAfter,
    afterEach: mockAfterEach,
    before: mockBefore,
    beforeEach: mockBeforeEach,
    default: mockTest,
    describe: mockDescribe,
    it: mockTest,
    mock: {
      fn: () => () => {},
      getter: () => {},
      method: () => {},
      reset: () => {},
      restoreAll: () => {},
      setter: () => {},
      timers: {
        enable: () => {},
        reset: () => {},
        runAll: () => {},
        tick: () => {},
      },
    },
    suite: mockDescribe,
    test: mockTest,
  };
};

/**
 * Convert mutable capture state to immutable CapturedTestFile
 */
const toCapturedTestFile = (
  state: CaptureState,
  filePath: string,
): CapturedTestFile => {
  return {
    filePath,
    framework: 'node-test',
    rootSuites: state.rootSuites.map(toImmutableSuite),
    rootTests: state.rootTests.map(toImmutableTest),
  };
};

const toImmutableSuite = (suite: MutableCapturedSuite): CapturedSuite => {
  return {
    children: suite.children.map(toImmutableSuite),
    hooks: suite.hooks as SuiteHooks,
    name: suite.name,
    tests: suite.tests.map(toImmutableTest),
  };
};

const toImmutableTest = (test: MutableCapturedTest): CapturedTest => {
  return {
    fn: test.fn,
    name: test.name,
    only: test.only,
    skip: test.skip,
  };
};

/**
 * Uninstall node:test mocks
 */
const uninstallNodeTestMocks = (): void => {
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.__MODESTBENCH_NODE_TEST_MOCK__;
};
