/**
 * ModestBench Mocha Adapter
 *
 * Captures test definitions from Mocha test files by replacing global
 * `describe`, `it`, and hook functions before the test file loads.
 *
 * Mocha exposes these as globals, making interception straightforward - no ES
 * module loader hooks required.
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
 * Internal state for capturing test definitions
 */
interface CaptureState {
  /** Stack of suite contexts for nested describes */
  currentSuite: CapturedSuite | null;
  /** Root-level suites */
  rootSuites: CapturedSuite[];
  /** Root-level tests (if any, though Mocha usually uses describe) */
  rootTests: CapturedTest[];
}

/**
 * Mocha-style describe function signature
 */
type DescribeFn = {
  (name: string, fn: () => void): void;
  only: (name: string, fn: () => void) => void;
  skip: (name: string, fn: () => void) => void;
};

/**
 * Mocha-style hook function signature
 */
type HookFn = (fn: () => Promise<void> | void) => void;

/**
 * Mocha-style it function signature
 */
type ItFn = {
  (name: string, fn: () => Promise<void> | void): void;
  only: (name: string, fn: () => Promise<void> | void) => void;
  skip: (name: string, fn: () => Promise<void> | void) => void;
};

/**
 * Mocha test framework adapter
 *
 * Captures tests by installing global mocks before importing the test file.
 */
export class MochaAdapter implements TestFrameworkAdapter {
  readonly framework = 'mocha' as const;

  /**
   * Capture test definitions from a Mocha test file
   *
   * @param filePath - Absolute path to the test file
   * @returns Captured test structure
   */
  async capture(filePath: string): Promise<CapturedTestFile> {
    // Install our mock globals
    const state = installMochaGlobals();

    try {
      // Import the test file - this triggers describe/it calls
      // which populate our state
      const fileUrl = pathToFileURL(filePath).href;

      // Use a cache-busting query param to ensure fresh import
      const bustCache = `?t=${Date.now()}`;
      await import(fileUrl + bustCache);

      // Return captured structure
      return {
        filePath,
        framework: 'mocha',
        rootSuites: state.rootSuites,
        rootTests: state.rootTests,
      };
    } finally {
      // Clean up globals
      uninstallMochaGlobals();
    }
  }
}

/**
 * Create empty hooks structure
 */
const createEmptyHooks = (): SuiteHooks => {
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
const createSuite = (name: string): CapturedSuite => {
  return {
    children: [],
    hooks: createEmptyHooks(),
    name,
    tests: [],
  };
};

/**
 * Install Mocha global mocks and return the capture state
 *
 * This replaces globalThis.describe, globalThis.it, etc. with our capturing
 * implementations.
 */
const installMochaGlobals = (): CaptureState => {
  const state: CaptureState = {
    currentSuite: null,
    rootSuites: [],
    rootTests: [],
  };

  // describe() - creates a suite
  const describe: DescribeFn = (name: string, fn: () => void) => {
    const suite = createSuite(name);
    const parent = state.currentSuite;

    if (parent) {
      // Nested describe: inherit beforeEach/afterEach from parent
      // and add to parent's children
      parent.children.push(suite);
    } else {
      // Root-level describe
      state.rootSuites.push(suite);
    }

    // Enter this suite context
    state.currentSuite = suite;

    // Execute the describe body to capture tests and nested describes
    fn();

    // Exit back to parent context
    state.currentSuite = parent;
  };

  // describe.only() - marks suite as exclusive
  describe.only = (name: string, fn: () => void) => {
    // For benchmarking, we treat .only the same as regular
    // (filtering happens at a higher level)
    describe(name, fn);
  };

  // describe.skip() - marks suite as skipped
  describe.skip = (_name: string, _fn: () => void) => {
    // Skip entirely - don't even register
  };

  // it() - creates a test
  const it: ItFn = (name: string, fn: () => Promise<void> | void) => {
    const test: CapturedTest = { fn, name };

    if (state.currentSuite) {
      state.currentSuite.tests.push(test);
    } else {
      // Root-level test (unusual for Mocha but supported)
      state.rootTests.push(test);
    }
  };

  // it.only() - marks test as exclusive
  it.only = (name: string, fn: () => Promise<void> | void) => {
    const test: CapturedTest = { fn, name, only: true };

    if (state.currentSuite) {
      state.currentSuite.tests.push(test);
    } else {
      state.rootTests.push(test);
    }
  };

  // it.skip() - marks test as skipped
  it.skip = (name: string, fn: () => Promise<void> | void) => {
    const test: CapturedTest = { fn, name, skip: true };

    if (state.currentSuite) {
      state.currentSuite.tests.push(test);
    } else {
      state.rootTests.push(test);
    }
  };

  // before() - runs once before all tests in suite
  const before: HookFn = (fn: () => Promise<void> | void) => {
    if (state.currentSuite) {
      (
        state.currentSuite.hooks.before as Array<() => Promise<void> | void>
      ).push(fn);
    }
    // Root-level before is ignored (no suite to attach to)
  };

  // after() - runs once after all tests in suite
  const after: HookFn = (fn: () => Promise<void> | void) => {
    if (state.currentSuite) {
      (
        state.currentSuite.hooks.after as Array<() => Promise<void> | void>
      ).push(fn);
    }
  };

  // beforeEach() - runs before each test
  const beforeEach: HookFn = (fn: () => Promise<void> | void) => {
    if (state.currentSuite) {
      (
        state.currentSuite.hooks.beforeEach as Array<() => Promise<void> | void>
      ).push(fn);
    }
  };

  // afterEach() - runs after each test
  const afterEach: HookFn = (fn: () => Promise<void> | void) => {
    if (state.currentSuite) {
      (
        state.currentSuite.hooks.afterEach as Array<() => Promise<void> | void>
      ).push(fn);
    }
  };

  // Install globals
  // @ts-expect-error - intentionally modifying globalThis
  globalThis.describe = describe;
  // @ts-expect-error - intentionally modifying globalThis
  globalThis.it = it;
  // @ts-expect-error - intentionally modifying globalThis
  globalThis.before = before;
  // @ts-expect-error - intentionally modifying globalThis
  globalThis.after = after;
  // @ts-expect-error - intentionally modifying globalThis
  globalThis.beforeEach = beforeEach;
  // @ts-expect-error - intentionally modifying globalThis
  globalThis.afterEach = afterEach;

  // Mocha aliases
  // @ts-expect-error - intentionally modifying globalThis
  globalThis.context = describe;
  // @ts-expect-error - intentionally modifying globalThis
  globalThis.specify = it;

  return state;
};

/**
 * Remove Mocha globals installed by installMochaGlobals
 */
const uninstallMochaGlobals = (): void => {
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.describe;
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.it;
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.before;
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.after;
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.beforeEach;
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.afterEach;
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.context;
  // @ts-expect-error - cleaning up globalThis
  delete globalThis.specify;
};
