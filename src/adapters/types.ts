/**
 * ModestBench Test Framework Adapter Types
 *
 * Shared types for capturing test definitions from various test frameworks
 * (Mocha, node:test, AVA) and converting them to modestbench benchmark format.
 */

import type { BenchmarkDefinition } from '../core/benchmark-schema.js';

/**
 * A captured test suite (describe block) from a test framework
 */
export interface CapturedSuite {
  /** Nested child suites */
  readonly children: CapturedSuite[];
  /** Lifecycle hooks for the suite */
  readonly hooks: SuiteHooks;
  /** Suite name */
  readonly name: string;
  /** Tests in this suite */
  readonly tests: CapturedTest[];
}

/**
 * A captured test function from a test framework
 */
export interface CapturedTest {
  /** Test function body */
  readonly fn: () => Promise<void> | void;
  /** Test name */
  readonly name: string;
  /** Whether this test is marked .only */
  readonly only?: boolean;
  /** Whether this test is marked .skip */
  readonly skip?: boolean;
}

/**
 * Result of capturing tests from a single file
 */
export interface CapturedTestFile {
  /** File path */
  readonly filePath: string;
  /** Test framework detected/used */
  readonly framework: TestFramework;
  /** Root-level suites (describe blocks) */
  readonly rootSuites: CapturedSuite[];
  /** Root-level tests (not in any describe block - e.g., AVA) */
  readonly rootTests: CapturedTest[];
}

/**
 * Options for converting captured tests to benchmarks
 */
export interface ConversionOptions {
  /** Number of benchmark iterations (default: from modestbench config) */
  readonly iterations?: number;
  /** Number of warmup iterations (default: from modestbench config) */
  readonly warmup?: number;
}

/**
 * Converted benchmark suite structure
 *
 * This is what capturedToBenchmark produces for each suite.
 */
export interface ConvertedBenchmarkSuite {
  benchmarks: Record<string, { fn: () => Promise<void> | void }>;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

/**
 * Lifecycle hooks captured from a test suite
 */
export interface SuiteHooks {
  /** Hooks to run once after all tests in suite */
  readonly after: Array<() => Promise<void> | void>;
  /** Hooks to run after each test */
  readonly afterEach: Array<() => Promise<void> | void>;
  /** Hooks to run once before all tests in suite */
  readonly before: Array<() => Promise<void> | void>;
  /** Hooks to run before each test */
  readonly beforeEach: Array<() => Promise<void> | void>;
}

/**
 * Supported test frameworks
 */
export type TestFramework = 'ava' | 'mocha' | 'node-test';

/**
 * Interface for test framework adapters
 *
 * Each adapter is responsible for:
 *
 * 1. Capturing test definitions from a test file
 * 2. Normalizing them to the CapturedTestFile format
 */
export interface TestFrameworkAdapter {
  /**
   * Capture test definitions from a file
   *
   * This method loads the test file with appropriate hooks/mocks in place to
   * capture test function definitions without executing the tests.
   *
   * @param filePath - Absolute path to the test file
   * @returns Captured test structure
   */
  capture(filePath: string): Promise<CapturedTestFile>;

  /** Framework this adapter handles */
  readonly framework: TestFramework;
}

/**
 * Convert captured test file to modestbench benchmark definition
 *
 * Transforms the CapturedTestFile structure into the BenchmarkDefinition format
 * that modestbench's engine can execute.
 */
export const capturedToBenchmark = (
  captured: CapturedTestFile,
): BenchmarkDefinition => {
  const suites: Record<string, ReturnType<typeof suiteToRecord>> = {};

  // Convert root-level tests to a default suite (AVA-style)
  if (captured.rootTests.length > 0) {
    suites['default'] = {
      benchmarks: Object.fromEntries(
        captured.rootTests
          .filter((t) => !t.skip)
          .map((test) => [test.name, { fn: test.fn }]),
      ),
    };
  }

  // Convert captured suites to benchmark suites
  for (const suite of captured.rootSuites) {
    const converted = convertSuite(suite);
    if (converted) {
      suites[suite.name] = converted;
    }
  }

  return { suites };
};

/**
 * Convert a captured suite to benchmark suite format
 */
const convertSuite = (
  suite: CapturedSuite,
): null | ReturnType<typeof suiteToRecord> => {
  // Skip empty suites
  const nonSkippedTests = suite.tests.filter((t) => !t.skip);
  if (nonSkippedTests.length === 0 && suite.children.length === 0) {
    return null;
  }

  return suiteToRecord(suite);
};

/**
 * Create a wrapped test function that runs beforeEach/afterEach hooks
 *
 * The hooks run with each benchmark iteration, matching test framework
 * semantics where beforeEach runs before each test execution.
 */
const createWrappedTestFn = (
  testFn: () => Promise<void> | void,
  hooks: SuiteHooks,
): (() => Promise<void> | void) => {
  // If no per-test hooks, return original function
  if (hooks.beforeEach.length === 0 && hooks.afterEach.length === 0) {
    return testFn;
  }

  // Wrap with hooks
  return async () => {
    // Run beforeEach hooks
    for (const hook of hooks.beforeEach) {
      await hook();
    }

    // Run test
    await testFn();

    // Run afterEach hooks (in reverse order, like most test frameworks)
    for (const hook of [...hooks.afterEach].reverse()) {
      await hook();
    }
  };
};

/**
 * Flatten nested suites into a list of [prefixed-name, wrapped-fn] pairs
 */
const flattenSuiteTests = (
  suite: CapturedSuite,
  prefix: string,
): Array<[string, () => Promise<void> | void]> => {
  const results: Array<[string, () => Promise<void> | void]> = [];

  // Add direct tests with prefix
  for (const test of suite.tests) {
    if (!test.skip) {
      const wrappedFn = createWrappedTestFn(test.fn, suite.hooks);
      results.push([`${prefix} > ${test.name}`, wrappedFn]);
    }
  }

  // Recursively add nested suite tests
  for (const child of suite.children) {
    const childResults = flattenSuiteTests(child, `${prefix} > ${child.name}`);
    results.push(...childResults);
  }

  return results;
};

/**
 * Helper to build the suite record structure
 */
const suiteToRecord = (suite: CapturedSuite) => {
  const benchmarks: Record<string, { fn: () => Promise<void> | void }> = {};

  // Add tests as benchmarks
  for (const test of suite.tests) {
    if (!test.skip) {
      // Wrap test function with beforeEach/afterEach hooks
      const wrappedFn = createWrappedTestFn(test.fn, suite.hooks);
      benchmarks[test.name] = { fn: wrappedFn };
    }
  }

  // Flatten nested suites into flat benchmark names
  // e.g., "Parent > Child > test" becomes "Child > test"
  for (const child of suite.children) {
    const childBenchmarks = flattenSuiteTests(child, child.name);
    for (const [name, fn] of childBenchmarks) {
      benchmarks[name] = { fn };
    }
  }

  // Combine before hooks into a single setup function
  const setup =
    suite.hooks.before.length > 0
      ? async () => {
          for (const hook of suite.hooks.before) {
            await hook();
          }
        }
      : undefined;

  // Combine after hooks into a single teardown function
  const teardown =
    suite.hooks.after.length > 0
      ? async () => {
          for (const hook of suite.hooks.after) {
            await hook();
          }
        }
      : undefined;

  return {
    benchmarks,
    ...(setup && { setup }),
    ...(teardown && { teardown }),
  };
};
