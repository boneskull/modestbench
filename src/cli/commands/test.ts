/**
 * ModestBench Test Adapter Command
 *
 * Run existing test files as benchmarks by capturing test definitions and
 * executing them through a lightweight benchmark runner.
 */

import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import type {
  BenchmarkRun,
  FileResult,
  ModestBenchConfig,
  RunSummary,
  SuiteResult,
  TaskResult,
} from '../../types/core.js';
import type { CliContext } from '../index.js';

import { AvaAdapter } from '../../adapters/ava-adapter.js';
import { MochaAdapter } from '../../adapters/mocha-adapter.js';
import { NodeTestAdapter } from '../../adapters/node-test-adapter.js';
import {
  type CapturedSuite,
  type CapturedTestFile,
  capturedToBenchmark,
  type ConvertedBenchmarkSuite,
  type TestFramework,
} from '../../adapters/types.js';
import { ExitCodes } from '../../types/cli.js';
import { createRunId } from '../../types/core.js';
import { isError } from '../../utils/type-guards.js';

/**
 * Get a minimal default config for test runs
 */
const getDefaultTestConfig = (
  iterations: number,
  warmup: number,
  verbose: boolean,
): ModestBenchConfig => ({
  bail: false,
  exclude: [],
  excludeTags: [],
  iterations,
  limitBy: 'iterations',
  metadata: {},
  pattern: [],
  quiet: false,
  reporterConfig: {},
  reporters: ['human'],
  tags: [],
  thresholds: {},
  time: 1000,
  timeout: 30000,
  verbose,
  warmup,
});

/**
 * Default iteration count for test benchmarks
 */
const DEFAULT_ITERATIONS = 100;

/**
 * Default warmup iterations
 */
const DEFAULT_WARMUP = 5;

/**
 * Test command options
 */
export interface TestOptions {
  /** Bail on first failure */
  bail?: boolean;
  /** Working directory */
  cwd?: string;
  /** Test framework to use */
  framework: TestFramework;
  /** Number of iterations per test */
  iterations?: number;
  /** Output JSON */
  json?: boolean;
  /** Disable color */
  noColor?: boolean;
  /** Test file paths or patterns */
  pattern?: string[];
  /** Quiet mode */
  quiet?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Warmup iterations */
  warmup?: number;
}

/**
 * Result of benchmarking a single test
 */
interface TestBenchmarkResult {
  /** Error if test failed */
  error?: Error;
  /** Number of iterations run */
  iterations: number;
  /** Maximum execution time in ms */
  max: number;
  /** Mean execution time in ms */
  mean: number;
  /** Minimum execution time in ms */
  min: number;
  /** Test name */
  name: string;
  /** Operations per second */
  opsPerSecond: number;
  /** Standard deviation in ms */
  stdDev: number;
  /** Total time in ms */
  totalTime: number;
}

/**
 * Handle test command - run test files as benchmarks
 */
export const handleTestCommand = async (
  context: CliContext,
  options: TestOptions,
): Promise<number> => {
  const verbose = options.verbose ?? false;
  const quiet = options.quiet ?? false;
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const warmup = options.warmup ?? DEFAULT_WARMUP;

  // Get the reporter (default to human unless JSON requested)
  const reporterName = options.json ? 'json' : 'human';
  const reporter = context.reporterRegistry.get(reporterName);

  try {
    // Select the appropriate adapter
    const adapter = selectAdapter(options.framework);

    if (verbose && !quiet) {
      console.error(`Using ${options.framework} adapter`);
    }

    // Resolve file paths
    const cwd = options.cwd ?? process.cwd();
    const patterns = options.pattern ?? [];

    if (patterns.length === 0) {
      console.error('Error: At least one test file path is required');
      return ExitCodes.CONFIG_ERROR;
    }

    // Build config for the run
    const config = getDefaultTestConfig(iterations, warmup, verbose);

    // Initialize run tracking
    const runStartTime = new Date();
    const fileResults: FileResult[] = [];
    let hasFailures = false;

    // Build initial run for onStart (will be updated at end)
    const runId = createRunId(crypto.randomUUID());
    const initialRun = buildBenchmarkRun(
      [],
      config,
      runStartTime,
      runStartTime,
      runId,
    );

    // Notify reporter of start
    await reporter?.onStart?.(initialRun);

    for (const pattern of patterns) {
      const filePath = resolve(cwd, pattern);
      const fileStartTime = new Date();

      if (verbose && !quiet) {
        console.error(`\nCapturing tests from: ${filePath}`);
      }

      await reporter?.onFileStart?.(filePath);

      try {
        const captured = await adapter.capture(filePath);

        if (verbose && !quiet) {
          const testCount = countAllTests(captured);
          console.error(`  Found ${testCount} test(s)`);
        }

        // Convert to benchmark definition
        const benchmarkDef = capturedToBenchmark(captured);

        // Run benchmarks and collect suite results
        const suiteResults: SuiteResult[] = [];

        // Execute benchmarks for each suite
        for (const [suiteName, suite] of Object.entries(
          benchmarkDef.suites,
        ) as Array<[string, ConvertedBenchmarkSuite]>) {
          const suiteStartTime = new Date();
          const taskResults: TaskResult[] = [];

          await reporter?.onSuiteStart?.(suiteName);

          // Run setup if present
          if (suite.setup) {
            try {
              await suite.setup();
            } catch (setupError) {
              const err = isError(setupError)
                ? setupError
                : new Error(String(setupError));
              await reporter?.onError?.(err);
              hasFailures = true;
              if (options.bail) {
                return ExitCodes.BENCHMARK_FAILURES;
              }
              continue;
            }
          }

          // Run each benchmark
          for (const [benchName, bench] of Object.entries(suite.benchmarks)) {
            await reporter?.onTaskStart?.(benchName);

            const result = await runBenchmark(
              benchName,
              bench.fn,
              iterations,
              warmup,
            );

            // Convert to TaskResult format
            const taskResult = convertToTaskResult(result);
            taskResults.push(taskResult);

            // Notify reporter
            await reporter?.onTaskResult?.(taskResult);

            if (result.error) {
              hasFailures = true;
              if (options.bail) {
                // Run teardown before bailing
                if (suite.teardown) {
                  try {
                    await suite.teardown();
                  } catch {
                    // Ignore teardown errors when bailing
                  }
                }
                return ExitCodes.BENCHMARK_FAILURES;
              }
            }
          }

          // Run teardown if present
          if (suite.teardown) {
            try {
              await suite.teardown();
            } catch (teardownError) {
              const err = isError(teardownError)
                ? teardownError
                : new Error(String(teardownError));
              await reporter?.onError?.(err);
            }
          }

          const suiteEndTime = new Date();
          const suiteResult: SuiteResult = {
            duration: suiteEndTime.getTime() - suiteStartTime.getTime(),
            endTime: suiteEndTime,
            name: suiteName,
            startTime: suiteStartTime,
            tasks: taskResults,
          };

          suiteResults.push(suiteResult);
          await reporter?.onSuiteEnd?.(suiteResult);
        }

        const fileEndTime = new Date();
        const fileResult: FileResult = {
          duration: fileEndTime.getTime() - fileStartTime.getTime(),
          endTime: fileEndTime,
          filePath,
          startTime: fileStartTime,
          suites: suiteResults,
        };

        fileResults.push(fileResult);
        await reporter?.onFileEnd?.(fileResult);
      } catch (captureError) {
        const err = isError(captureError)
          ? captureError
          : new Error(String(captureError));
        await reporter?.onError?.(err);
        hasFailures = true;
        if (options.bail) {
          return ExitCodes.BENCHMARK_FAILURES;
        }
      }
    }

    // Build final run result
    const runEndTime = new Date();
    const run = buildBenchmarkRun(
      fileResults,
      config,
      runStartTime,
      runEndTime,
      runId,
    );

    // Notify reporter of end
    await reporter?.onEnd?.(run);

    return hasFailures ? ExitCodes.BENCHMARK_FAILURES : ExitCodes.SUCCESS;
  } catch (error) {
    const err = isError(error) ? error : new Error(String(error));
    await reporter?.onError?.(err);
    return ExitCodes.RUNTIME_ERROR;
  }
};

/**
 * Run a benchmark for a single test function
 */
const runBenchmark = async (
  name: string,
  fn: () => Promise<void> | void,
  iterations: number,
  warmup: number,
): Promise<TestBenchmarkResult> => {
  const times: number[] = [];

  try {
    // Warmup phase
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // Measurement phase
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    // Calculate statistics
    const totalTime = times.reduce((a, b) => a + b, 0);
    const mean = totalTime / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    // Standard deviation
    const squaredDiffs = times.map((t) => Math.pow(t - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Ops per second
    const opsPerSecond = mean > 0 ? 1000 / mean : 0;

    return {
      iterations,
      max,
      mean,
      min,
      name,
      opsPerSecond,
      stdDev,
      totalTime,
    };
  } catch (error) {
    return {
      error: isError(error) ? error : new Error(String(error)),
      iterations: 0,
      max: 0,
      mean: 0,
      min: 0,
      name,
      opsPerSecond: 0,
      stdDev: 0,
      totalTime: 0,
    };
  }
};

/**
 * Convert internal TestBenchmarkResult to standard TaskResult format
 *
 * Note: Times are converted from milliseconds to nanoseconds
 */
const convertToTaskResult = (result: TestBenchmarkResult): TaskResult => {
  const MS_TO_NS = 1_000_000;

  // Calculate coefficient of variation (stdDev/mean × 100)
  const cv = result.mean > 0 ? (result.stdDev / result.mean) * 100 : 0;

  // Estimate margin of error (using 95% confidence, ~1.96 * stdErr)
  const stdErr = result.stdDev / Math.sqrt(result.iterations);
  const marginOfError =
    result.mean > 0 ? ((1.96 * stdErr) / result.mean) * 100 : 0;

  // Variance is stdDev squared
  const variance = result.stdDev * result.stdDev * MS_TO_NS * MS_TO_NS;

  return {
    cv,
    error: result.error,
    iterations: result.iterations,
    marginOfError,
    max: result.max * MS_TO_NS,
    mean: result.mean * MS_TO_NS,
    min: result.min * MS_TO_NS,
    name: result.name,
    opsPerSecond: result.opsPerSecond,
    // Estimate percentiles (we don't have full distribution, use max as approximation)
    p95: result.max * MS_TO_NS * 0.95,
    p99: result.max * MS_TO_NS * 0.99,
    stdDev: result.stdDev * MS_TO_NS,
    variance,
  };
};

/**
 * Build the final BenchmarkRun result structure
 */
const buildBenchmarkRun = (
  files: FileResult[],
  config: ModestBenchConfig,
  startTime: Date,
  endTime: Date,
  runId: ReturnType<typeof createRunId>,
): BenchmarkRun => {
  // Collect all task results for summary
  const allTasks: TaskResult[] = [];
  for (const file of files) {
    for (const suite of file.suites) {
      allTasks.push(...suite.tasks);
    }
  }

  // Find fastest and slowest
  const validTasks = allTasks.filter((t) => !t.error && t.opsPerSecond > 0);
  const fastest =
    validTasks.length > 0
      ? validTasks.reduce((a, b) => (a.opsPerSecond > b.opsPerSecond ? a : b))
      : null;
  const slowest =
    validTasks.length > 0
      ? validTasks.reduce((a, b) => (a.opsPerSecond < b.opsPerSecond ? a : b))
      : null;

  // Calculate summary
  const summary: RunSummary = {
    failedTasks: allTasks.filter((t) => t.error).length,
    fastest,
    overallMean:
      validTasks.length > 0
        ? validTasks.reduce((sum, t) => sum + t.mean, 0) / validTasks.length
        : 0,
    passedTasks: validTasks.length,
    slowest,
    totalFiles: files.length,
    totalOperations: allTasks.reduce((sum, t) => sum + t.iterations, 0),
    totalSuites: files.reduce((sum, f) => sum + f.suites.length, 0),
    totalTasks: allTasks.length,
  };

  return {
    config,
    duration: endTime.getTime() - startTime.getTime(),
    endTime,
    environment: {
      arch: process.arch,
      availableMemory: 0,
      cpu: {
        cores: 1,
        model: 'unknown',
        speed: 0,
      },
      env: {},
      hostname: 'localhost',
      memory: {
        free: 0,
        total: 0,
        used: 0,
      },
      nodeVersion: process.version,
      platform: process.platform,
    },
    files,
    id: runId,
    startTime,
    summary,
  };
};

/**
 * Select the appropriate adapter for the framework
 */
const selectAdapter = (framework: TestFramework) => {
  switch (framework) {
    case 'ava':
      return new AvaAdapter();
    case 'mocha':
      return new MochaAdapter();
    case 'node-test':
      return new NodeTestAdapter();
    default: {
      const _exhaustive: never = framework;
      throw new Error(`Unknown framework: ${framework}`);
    }
  }
};

/**
 * Count all tests in a captured file
 */
const countAllTests = (captured: CapturedTestFile): number => {
  let count = captured.rootTests.length;
  for (const suite of captured.rootSuites) {
    count += countTestsInSuite(suite);
  }
  return count;
};

/**
 * Count tests in a suite recursively
 */
const countTestsInSuite = (suite: CapturedSuite): number => {
  let count = suite.tests.length;
  for (const child of suite.children) {
    count += countTestsInSuite(child);
  }
  return count;
};
