/**
 * AccurateEngine - High-accuracy benchmark execution implementation
 *
 * Concrete implementation of ModestBenchEngine using measurement techniques
 * adapted from bench-node for improved accuracy. Uses V8 optimization guards
 * and array-based sample collection with IQR outlier removal.
 *
 * **Requirements:**
 *
 * - Node.js >= 20
 * - --allow-natives-syntax flag (for V8 optimization guards)
 *
 * **Key Features:**
 *
 * - V8NeverOptimize guards prevent JIT optimization artifacts
 * - Adaptive iteration calculation based on operation duration
 * - IQR-based outlier removal for improved stability
 * - Comprehensive statistics (mean, stdDev, variance, CV, percentiles)
 * - Full ModestBench feature support (progress, abort, filtering)
 */

import type {
  BenchmarkTask,
  ModestBenchConfig,
  Reporter,
  TaskResult,
} from '../../types/index.js';

import { StructureValidationError } from '../../errors/index.js';
import { ModestBenchEngine } from '../engine.js';
import { calculateStatistics, removeOutliersIQR } from '../stats-utils.js';

/**
 * AccurateEngine - High-accuracy benchmarking with V8 optimization guards
 */
export class AccurateEngine extends ModestBenchEngine {
  /**
   * Maximum iterations per round to prevent overwhelming Node.js test runner
   * and excessive memory usage
   */
  private static readonly MAX_ITERATIONS_PER_ROUND = 10000;

  /**
   * Maximum iterations per round for async functions (much lower due to
   * sequential await overhead)
   */
  private static readonly MAX_ITERATIONS_PER_ROUND_ASYNC = 100;

  private hasCheckedNativeSyntax = false;

  private nativeSyntaxErrorShown = false;

  private nativeSyntaxSupported = false;

  /**
   * Execute a single benchmark task using accurate measurement techniques
   *
   * This is the main integration point with ModestBench's engine abstraction.
   */
  protected async executeBenchmarkTask(
    taskName: string,
    taskData: BenchmarkTask,
    config: ModestBenchConfig,
    _reporters: Reporter[] = [],
    signal?: AbortSignal,
  ): Promise<TaskResult> {
    try {
      if (!taskData.fn || typeof taskData.fn !== 'function') {
        throw new StructureValidationError(
          'Benchmark task must have a "fn" function property',
        );
      }

      // Detect if function is async by testing it
      const testResult = taskData.fn();
      const isAsync =
        testResult != null &&
        typeof testResult === 'object' &&
        'then' in testResult &&
        typeof testResult.then === 'function';
      if (isAsync) {
        // Clean up the test promise/thenable
        const thenable = testResult as PromiseLike<unknown>;
        thenable.then(
          () => {
            /* ignore */
          },
          () => {
            /* ignore */
          },
        );
      }

      // For async functions, cap iterations to prevent excessive sequential rounds
      // Even with limitBy: 'iterations', 5000 samples = 5000 rounds of async calls
      // which is impractically slow. Cap at 1000 for reasonable balance.
      const effectiveConfig =
        isAsync && config.iterations > 1000
          ? { ...config, iterations: 1000 }
          : config;

      // Check for V8 native syntax support
      const useOptGuards = this.checkNativeSyntax();

      // Show helpful error if native syntax not available
      if (!useOptGuards && !this.nativeSyntaxErrorShown) {
        if (!config.quiet) {
          // Get the path to the modestbench executable from process.argv
          const modestbenchPath = process.argv[1] || 'modestbench';

          console.warn(
            '\n⚠️  AccurateEngine recommends --allow-natives-syntax flag for best accuracy.',
            '\nRunning in fallback mode (reduced accuracy).',
            '\n\nTo enable V8 optimization guards:',
            `\n  node --allow-natives-syntax ${modestbenchPath}`,
            '\n',
          );
        }
        this.nativeSyntaxErrorShown = true;
      }

      // Execute benchmark with or without opt guards, and with async support
      const rawSamples = useOptGuards
        ? await this.executeBenchmarkWithOptGuards(
            taskData.fn,
            effectiveConfig,
            signal,
            isAsync,
          )
        : await this.executeBenchmarkBasic(
            taskData.fn,
            effectiveConfig,
            signal,
            isAsync,
          );

      // Check if aborted - return minimal valid result marked as aborted
      // (abort message is shown at run level, not per-task)
      if (signal?.aborted) {
        return {
          aborted: true,
          cv: 0,
          iterations: rawSamples.length,
          marginOfError: 0,
          max: 0,
          mean: 0,
          metadata: taskData.metadata ?? {},
          min: 0,
          name: taskName,
          opsPerSecond: 0,
          p95: 0,
          p99: 0,
          stdDev: 0,
          ...(taskData.tags ? { tags: taskData.tags } : {}),
          variance: 0,
        };
      }

      // Remove outliers using IQR method
      const samples = removeOutliersIQR(rawSamples);

      // Calculate statistics
      const stats = calculateStatistics(samples);

      // Transform to TaskResult
      const taskResult: TaskResult = {
        cv: stats.cv,
        iterations: samples.length,
        marginOfError: stats.marginOfError,
        max: stats.max,
        mean: stats.mean, // nanoseconds
        metadata: taskData.metadata ?? {},
        min: stats.min,
        name: taskName,
        opsPerSecond: 1e9 / stats.mean, // Convert ns to ops/sec
        p95: stats.p95,
        p99: stats.p99,
        stdDev: stats.stdDev,
        variance: stats.variance,
        ...(taskData.tags ? { tags: taskData.tags } : {}),
      };

      return taskResult;
    } catch (error) {
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      const errorResult: TaskResult = {
        cv: 0,
        error: executionError,
        iterations: 0,
        marginOfError: 0,
        max: 0,
        mean: 0,
        metadata: taskData.metadata ?? {},
        min: 0,
        name: taskName,
        opsPerSecond: 0,
        p95: 0,
        p99: 0,
        stdDev: 0,
        ...(taskData.tags ? { tags: taskData.tags } : {}),
        variance: 0,
      };
      return errorResult;
    }
  }

  /**
   * Calculate initial iterations based on benchmark characteristics Adapted
   * from bench-node's getInitialIterations algorithm
   */
  private async calculateInitialIterations(
    fn: (...args: unknown[]) => unknown,
    targetTime: number, // in seconds
    isAsync = false,
  ): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const timer = process.hrtime.bigint;
    const MIN_RESOLUTION = 0.5; // nanoseconds
    const SCALE = 1e9; // ns to seconds

    // Run a quick test with 30 iterations (fewer for async to keep it fast)
    const testIterations = isAsync ? 10 : 30;
    const start = timer();

    if (isAsync) {
      for (let i = 0; i < testIterations; i++) {
        await fn();
      }
    } else {
      for (let i = 0; i < testIterations; i++) {
        fn();
      }
    }

    const duration = Number(timer() - start);
    const durationPerOp = Math.max(MIN_RESOLUTION, duration / testIterations);

    // Calculate how many iterations we need for targetTime
    const totalOpsForTargetTime = targetTime / (durationPerOp / SCALE);

    // Use appropriate max based on sync/async
    const maxIterations = isAsync
      ? AccurateEngine.MAX_ITERATIONS_PER_ROUND_ASYNC
      : AccurateEngine.MAX_ITERATIONS_PER_ROUND;

    return Math.min(
      maxIterations,
      Math.max(1, Math.round(totalOpsForTargetTime)),
    );
  }

  /**
   * Check if V8 native syntax is available
   */
  private checkNativeSyntax(): boolean {
    if (this.hasCheckedNativeSyntax) {
      return this.nativeSyntaxSupported;
    }

    try {
      // Try to use a V8 intrinsic - this is the definitive test
      // Must create AND execute the function to test if syntax is available

      // SAFETY: This string is hardcoded and never influenced by user input.
      // We use new Function() specifically to test V8 intrinsics support.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
      new Function('%NeverOptimizeFunction(() => {})')();
      this.nativeSyntaxSupported = true;
    } catch {
      this.nativeSyntaxSupported = false;
    }

    this.hasCheckedNativeSyntax = true;
    return this.nativeSyntaxSupported;
  }

  /**
   * Execute benchmark WITHOUT V8 optimization guards (fallback)
   */
  private async executeBenchmarkBasic(
    fn: (...args: unknown[]) => unknown,
    config: ModestBenchConfig,
    signal?: AbortSignal,
    isAsync = false,
  ): Promise<number[]> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const timer = process.hrtime.bigint;
    const samples: number[] = [];
    const SCALE = 1e9;

    const targetTime = config.time / 1000;
    const initialIterations = await this.calculateInitialIterations(
      fn,
      targetTime,
      isAsync,
    );

    if (config.warmup > 0) {
      const warmupTime = Math.min(config.warmup / 1000, 0.05);
      await this.runWarmup(fn, initialIterations, warmupTime, isAsync);
    }

    const maxDuration = (config.time / 1000) * SCALE;
    let timeSpent = 0;
    let iterations = initialIterations;

    // Use appropriate max based on sync/async
    const maxIterations = isAsync
      ? AccurateEngine.MAX_ITERATIONS_PER_ROUND_ASYNC
      : AccurateEngine.MAX_ITERATIONS_PER_ROUND;

    // Determine loop condition based on limitBy setting
    const shouldContinue = (): boolean => {
      if (signal?.aborted) {
        return false;
      }

      const timeRemaining = timeSpent < maxDuration;
      const samplesRemaining = samples.length < config.iterations;

      switch (config.limitBy) {
        case 'all':
          return timeRemaining && samplesRemaining;
        case 'any':
          return timeRemaining || samplesRemaining;
        case 'iterations':
          return samplesRemaining;
        case 'time':
          return timeRemaining;
        default:
          return timeRemaining && samplesRemaining;
      }
    };

    while (shouldContinue()) {
      const start = timer();

      if (isAsync) {
        // For async functions, await each call individually and check for abort
        for (let i = 0; i < iterations; i++) {
          if (signal?.aborted) {
            break;
          }
          await fn();
        }
      } else {
        // For sync functions, check for abort every 50 iterations
        for (let i = 0; i < iterations; i++) {
          if (i % 50 === 0 && signal?.aborted) {
            break;
          }
          fn();
        }
      }

      // Early exit if aborted during inner loop
      if (signal?.aborted) {
        break;
      }

      const duration = Number(timer() - start);
      const durationPerOp = duration / iterations;

      samples.push(durationPerOp);
      timeSpent += duration;

      if (samples.length % 100 === 0) {
        this.progressManager.forceUpdate();
      }

      const remainingTime = Math.max(0, (maxDuration - timeSpent) / SCALE);
      iterations = Math.round(remainingTime / (durationPerOp / SCALE));
      iterations = Math.max(1, Math.min(maxIterations, iterations));
    }

    return samples;
  }

  /**
   * Execute benchmark WITH V8 optimization guards (more accurate)
   */
  private async executeBenchmarkWithOptGuards(
    fn: (...args: unknown[]) => unknown,
    config: ModestBenchConfig,
    signal?: AbortSignal,
    isAsync = false,
  ): Promise<number[]> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const timer = process.hrtime.bigint;
    const samples: number[] = [];
    const SCALE = 1e9;

    // Calculate iterations based on config
    const targetTime = config.time / 1000; // ms to seconds
    const initialIterations = await this.calculateInitialIterations(
      fn,
      targetTime,
      isAsync,
    );

    // Run warmup
    if (config.warmup > 0) {
      const warmupTime = Math.min(config.warmup / 1000, 0.05); // Max 50ms warmup
      await this.runWarmup(fn, initialIterations, warmupTime, isAsync);
    }

    // Create DoNotOptimize wrapper using V8 intrinsics
    // This prevents V8 from optimizing away the benchmark code
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const DoNotOptimize = new Function('x', 'return x');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const NeverOptimize = new Function(
      'fn',
      '%NeverOptimizeFunction(fn); return fn;',
    );
    // eslint-disable-next-line new-cap, @typescript-eslint/no-unsafe-call
    const guardedDoNotOptimize = NeverOptimize(DoNotOptimize) as (
      x: unknown,
    ) => unknown;

    const maxDuration = (config.time / 1000) * SCALE;
    let timeSpent = 0;
    let iterations = initialIterations;

    // Use appropriate max based on sync/async
    const maxIterations = isAsync
      ? AccurateEngine.MAX_ITERATIONS_PER_ROUND_ASYNC
      : AccurateEngine.MAX_ITERATIONS_PER_ROUND;

    // Determine loop condition based on limitBy setting
    const shouldContinue = (): boolean => {
      if (signal?.aborted) {
        return false;
      }

      const timeRemaining = timeSpent < maxDuration;
      const samplesRemaining = samples.length < config.iterations;

      switch (config.limitBy) {
        case 'all':
          return timeRemaining && samplesRemaining;
        case 'any':
          return timeRemaining || samplesRemaining;
        case 'iterations':
          return samplesRemaining;
        case 'time':
          return timeRemaining;
        default:
          return timeRemaining && samplesRemaining;
      }
    };

    // Main benchmark loop
    while (shouldContinue()) {
      const start = timer();

      if (isAsync) {
        // For async functions, await each call individually and check for abort
        for (let i = 0; i < iterations; i++) {
          if (signal?.aborted) {
            break;
          }
          const result = await fn();
          guardedDoNotOptimize(result); // Prevent optimization
        }
      } else {
        // For sync functions, check for abort every 50 iterations
        for (let i = 0; i < iterations; i++) {
          if (i % 50 === 0 && signal?.aborted) {
            break;
          }
          const result = fn();
          guardedDoNotOptimize(result); // Prevent optimization
        }
      }

      // Early exit if aborted during inner loop
      if (signal?.aborted) {
        break;
      }

      const duration = Number(timer() - start);
      const durationPerOp = duration / iterations;

      samples.push(durationPerOp);
      timeSpent += duration;

      // Update progress every 100 samples
      if (samples.length % 100 === 0) {
        this.progressManager.forceUpdate();
      }

      // Adjust iterations for next round
      const remainingTime = Math.max(0, (maxDuration - timeSpent) / SCALE);
      iterations = Math.round(remainingTime / (durationPerOp / SCALE));
      iterations = Math.max(1, Math.min(maxIterations, iterations));
    }

    return samples;
  }

  /**
   * Run warmup phase Adapted from bench-node's runWarmup algorithm
   */
  private async runWarmup(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    fn: Function,
    initialIterations: number,
    warmupTime: number, // in seconds
    isAsync = false,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const timer = process.hrtime.bigint;
    const MIN_RESOLUTION = 0.5;
    const SCALE = 1e9;
    const maxDuration = warmupTime * SCALE;
    const minSamples = 10;

    // Use appropriate max based on sync/async
    const maxIterations = isAsync
      ? AccurateEngine.MAX_ITERATIONS_PER_ROUND_ASYNC
      : AccurateEngine.MAX_ITERATIONS_PER_ROUND;

    let timeSpent = 0n;
    let samples = 0;
    let iterations = Math.min(initialIterations, maxIterations);

    while (Number(timeSpent) < maxDuration || samples <= minSamples) {
      const start = timer();

      if (isAsync) {
        for (let i = 0; i < iterations; i++) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          await fn();
        }
      } else {
        for (let i = 0; i < iterations; i++) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          fn();
        }
      }

      const duration = timer() - start;
      timeSpent += duration;
      samples++;

      // Adjust iterations for next round
      const durationPerOp = Math.max(
        MIN_RESOLUTION,
        Number(duration) / iterations,
      );
      const remainingTime = Math.max(
        0,
        (maxDuration - Number(timeSpent)) / SCALE,
      );
      iterations = Math.round(remainingTime / (durationPerOp / SCALE));
      iterations = Math.max(1, Math.min(maxIterations, iterations));
    }
  }
}
