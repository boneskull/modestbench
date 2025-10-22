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
        throw new Error('Benchmark task must have a "fn" function property');
      }

      // Check for V8 native syntax support
      const useOptGuards = this.checkNativeSyntax();

      // Show helpful error if native syntax not available
      if (!useOptGuards && !this.nativeSyntaxErrorShown) {
        if (!config.quiet) {
          console.warn(
            '\n⚠️  AccurateEngine requires --allow-natives-syntax flag for best accuracy.',
            '\nRunning in fallback mode (reduced accuracy).',
            '\n\nTo enable V8 optimization guards:',
            '\n  node --allow-natives-syntax --test',
            '\n  or add to package.json: "test": "node --allow-natives-syntax ..."',
            '\n',
          );
        }
        this.nativeSyntaxErrorShown = true;
      }

      // Execute benchmark with or without opt guards
      const rawSamples = useOptGuards
        ? await this.executeBenchmarkWithOptGuards(taskData.fn, config, signal)
        : await this.executeBenchmarkBasic(taskData.fn, config, signal);

      // Check if aborted
      if (signal?.aborted) {
        return {
          cv: 0,
          error: new Error('Benchmark aborted by user signal'),
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
  ): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const timer = process.hrtime.bigint;
    const MIN_RESOLUTION = 0.5; // nanoseconds
    const SCALE = 1e9; // ns to seconds

    // Run a quick test with 30 iterations
    const testIterations = 30;
    const start = timer();

    for (let i = 0; i < testIterations; i++) {
      fn();
    }

    const duration = Number(timer() - start);
    const durationPerOp = Math.max(MIN_RESOLUTION, duration / testIterations);

    // Calculate how many iterations we need for targetTime
    const totalOpsForTargetTime = targetTime / (durationPerOp / SCALE);

    return Math.min(
      Number.MAX_SAFE_INTEGER,
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
  ): Promise<number[]> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const timer = process.hrtime.bigint;
    const samples: number[] = [];
    const SCALE = 1e9;

    const targetTime = config.time / 1000;
    const initialIterations = await this.calculateInitialIterations(
      fn,
      targetTime,
    );

    if (config.warmup > 0) {
      const warmupTime = Math.min(config.warmup / 1000, 0.05);
      await this.runWarmup(fn, initialIterations, warmupTime);
    }

    const maxDuration = (config.time / 1000) * SCALE;
    let timeSpent = 0;
    let iterations = initialIterations;

    while (timeSpent < maxDuration || samples.length < config.iterations) {
      if (signal?.aborted) {
        break;
      }

      const start = timer();

      for (let i = 0; i < iterations; i++) {
        fn();
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
      iterations = Math.max(
        1,
        Math.min(AccurateEngine.MAX_ITERATIONS_PER_ROUND, iterations),
      );
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
    );

    // Run warmup
    if (config.warmup > 0) {
      const warmupTime = Math.min(config.warmup / 1000, 0.05); // Max 50ms warmup
      await this.runWarmup(fn, initialIterations, warmupTime);
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

    // Main benchmark loop
    while (timeSpent < maxDuration || samples.length < config.iterations) {
      if (signal?.aborted) {
        break;
      }

      const start = timer();

      for (let i = 0; i < iterations; i++) {
        const result = fn();
        guardedDoNotOptimize(result); // Prevent optimization
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
      iterations = Math.max(
        1,
        Math.min(AccurateEngine.MAX_ITERATIONS_PER_ROUND, iterations),
      );
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
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const timer = process.hrtime.bigint;
    const MIN_RESOLUTION = 0.5;
    const SCALE = 1e9;
    const maxDuration = warmupTime * SCALE;
    const minSamples = 10;

    let timeSpent = 0n;
    let samples = 0;
    let iterations = Math.min(
      initialIterations,
      AccurateEngine.MAX_ITERATIONS_PER_ROUND,
    );

    while (Number(timeSpent) < maxDuration || samples <= minSamples) {
      const start = timer();

      for (let i = 0; i < iterations; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        fn();
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
      iterations = Math.max(
        1,
        Math.min(AccurateEngine.MAX_ITERATIONS_PER_ROUND, iterations),
      );
    }
  }
}
