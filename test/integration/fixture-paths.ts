/**
 * Integration test fixture paths
 *
 * Provides typed paths to all static benchmark fixtures, eliminating the need
 * for runtime file creation in most integration tests.
 *
 * @packageDocumentation
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Base directory for integration test fixtures
 */
export const FIXTURE_DIR = join(__dirname, 'fixture');

/**
 * Paths to all available benchmark fixtures
 */
export const fixtures = {
  /** Longer running benchmark for abort signal tests */
  abortable: join(FIXTURE_DIR, 'abortable.bench.js'),
  // Specialized
  /** Array.push/unshift benchmarks */
  arrayOperations: join(FIXTURE_DIR, 'array-operations.bench.js'),
  /** Async operations (Promise.resolve) */
  asyncOperations: join(FIXTURE_DIR, 'async-operations.bench.js'),
  // Baseline command tests
  /** Benchmark for baseline command tests */
  baselineTest: join(FIXTURE_DIR, 'baseline-test.bench.js'),
  // Configuration tests
  /** Benchmark for configuration file tests */
  configTest: join(FIXTURE_DIR, 'config-test.bench.js'),

  /** CSV reporter tests */
  csvTasks: join(FIXTURE_DIR, 'csv-tasks.bench.js'),
  /** Task that throws with specific error message */
  errorThrowing: join(FIXTURE_DIR, 'error-throwing.bench.js'),
  // Error scenarios
  /** Task that throws an error */
  failing: join(FIXTURE_DIR, 'failing.bench.js'),
  /** Benchmark for history compare tests */
  historyCompare: join(FIXTURE_DIR, 'history-compare.bench.js'),
  /** Detailed benchmark for history show tests */
  historyDetailed: join(FIXTURE_DIR, 'history-detailed.bench.js'),
  /** Performance suite for detailed history comparison */
  historyPerformance: join(FIXTURE_DIR, 'history-performance.bench.js'),

  // History viewing tests
  /** Simple benchmark for history tests */
  historySimple: join(FIXTURE_DIR, 'history-simple.bench.js'),

  /** Benchmark for history trends tests */
  historyTrends: join(FIXTURE_DIR, 'history-trends.bench.js'),
  // Reporter tests
  /** Human reporter output tests */
  humanOutput: join(FIXTURE_DIR, 'human-output.bench.js'),
  /** Benchmark with inline config for merge tests */
  inlineConfig: join(FIXTURE_DIR, 'inline-config.bench.js'),
  /** Invalid structure (`{ invalid: true }`) */
  invalid: join(FIXTURE_DIR, 'invalid.bench.js'),

  /** Fast benchmark for iteration count tests */
  iterationCount: join(FIXTURE_DIR, 'iteration-count.bench.js'),
  /** Measurement consistency tests */
  measurement: join(FIXTURE_DIR, 'measurement.bench.js'),
  /** Good task, failing task, another good task */
  mixedResults: join(FIXTURE_DIR, 'mixed-results.bench.js'),
  /** Three tasks (task 1/2/3) */
  multiTask: join(FIXTURE_DIR, 'multi-task.bench.js'),
  // Profile command scripts (not benchmarks)
  /** Script with hot function for profile command testing */
  profileHotFunction: join(FIXTURE_DIR, 'profile-hot-function.js'),

  /** Script with multiple functions for profile command testing */
  profileMultiFunction: join(FIXTURE_DIR, 'profile-multi-function.js'),
  /** Suite with setup that throws */
  setupFailure: join(FIXTURE_DIR, 'setup-failure.bench.js'),
  // Setup/Teardown
  /** Suite with setup creating global data and teardown cleaning it */
  setupTeardown: join(FIXTURE_DIR, 'setup-teardown.bench.js'),

  // Basic benchmarks
  /** Single task: `fn: () => 1 + 1` */
  simple: join(FIXTURE_DIR, 'simple.bench.js'),
  // Engine comparison
  /** Simple math operations (addition, multiplication) */
  simpleMath: join(FIXTURE_DIR, 'simple-math.bench.js'),

  /** Simple reporter output tests (no colors/ANSI) */
  simpleOutput: join(FIXTURE_DIR, 'simple-output.bench.js'),

  /** Single task returning 42 */
  simpleReturn42: join(FIXTURE_DIR, 'simple-return-42.bench.js'),
  /** Two tasks in one suite (Fast Task, Another Task) */
  simpleTwoTasks: join(FIXTURE_DIR, 'simple-two-tasks.bench.js'),
  /** Successful task (paired with failing for bail tests) */
  success: join(FIXTURE_DIR, 'success.bench.js'),
  /** Benchmark with suite-level config */
  suiteConfig: join(FIXTURE_DIR, 'suite-config.bench.js'),
  /** Two suites with multiple tasks each */
  twoSuites: join(FIXTURE_DIR, 'two-suites.bench.js'),

  /** Benchmark with inline `config.iterations` */
  withConfigIterations: join(FIXTURE_DIR, 'with-config-iterations.bench.js'),
  /** Task-level metadata tags */
  withMetadataTags: join(FIXTURE_DIR, 'with-metadata-tags.bench.js'),
  /** Tasks with tags for filtering tests */
  withTags: join(FIXTURE_DIR, 'with-tags.bench.js'),
} as const;

/**
 * Type representing all available fixture keys
 */
export type FixtureKey = keyof typeof fixtures;
