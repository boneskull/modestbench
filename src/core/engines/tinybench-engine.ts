/**
 * TinybenchEngine - Tinybench-specific benchmark execution implementation
 *
 * Concrete implementation of ModestBenchEngine using the tinybench library for
 * benchmark execution and measurement.
 */

import { Bench } from 'tinybench';

import type {
  BenchmarkTask,
  ModestBenchConfig,
  Reporter,
  TaskResult,
} from '../../types/index.js';

import { ModestBenchEngine } from '../engine.js';

/**
 * Tinybench-specific benchmark execution engine
 */
export class TinybenchEngine extends ModestBenchEngine {
  /**
   * Execute a single benchmark task using tinybench
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

      // Determine effective time and iterations based on limitBy mode
      let effectiveTime: number;
      let effectiveIterations: number;

      switch (config.limitBy) {
        case 'all':
          // Both must be met - tinybench default behavior

          effectiveTime = Math.min(config.time || 1000, 2000);
          effectiveIterations = config.iterations;
          break;

        case 'any':
          // Stop at whichever comes first
          // Since tinybench requires BOTH to be met, use iterations mode for faster completion
          // This means if iterations completes before time, it stops (time=1ms ensures time completes fast)
          effectiveTime = 1;
          effectiveIterations = config.iterations;
          break;

        case 'iterations':
          // Iterations is the limit, use minimal time
          effectiveTime = 1;
          effectiveIterations = config.iterations;
          break;

        case 'time':
          // Time is the limit, iterations is a minimum (use small value)
          effectiveTime = Math.min(config.time || 1000, 2000);
          effectiveIterations = 1; // Minimal iterations so time is the limiting factor
          break;

        default:
          // Fallback to iterations mode
          effectiveTime = 1;
          effectiveIterations = config.iterations;
      }

      const bench = new Bench({
        iterations: effectiveIterations,
        time: effectiveTime,
        warmupIterations: config.warmup,
        warmupTime: config.warmup > 0 ? Math.min(config.warmup || 0, 500) : 0,
      });

      // Add the task with signal for task-level abort support
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Pending https://github.com/tinylibs/tinybench/pull/364
      bench.add(taskName, taskData.fn, signal ? { signal } : undefined);

      // Set up periodic progress updates during execution
      const progressInterval = setInterval(() => {
        // Force progress update to show current state with ETA
        this.progressManager.forceUpdate();
      }, 500); // Update every 500ms during execution

      try {
        // Run the benchmark
        await bench.run();
      } catch (error) {
        clearInterval(progressInterval);
        // Handle array length errors for extremely fast operations
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('Invalid array length')) {
          // Retry with minimal time (1ms) for extremely fast operations
          // Use same limiting logic but with minimal time for fast ops
          let retryTime: number;
          switch (config.limitBy) {
            case 'all':
            case 'any':
              retryTime = 10;
              break;
            case 'iterations':
              retryTime = 1;
              break;
            case 'time':
              retryTime = 10;
              break;
            default:
              retryTime = 1;
          }

          const minimalBench = new Bench({
            iterations: config.iterations,
            time: retryTime,
            warmupIterations: config.warmup,
            warmupTime: 0,
          });
          minimalBench.add(
            taskName,
            taskData.fn,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - Pending https://github.com/tinylibs/tinybench/pull/364
            signal ? { signal } : undefined,
          );
          try {
            await minimalBench.run();
          } catch {
            // If still failing, the operation is too fast even for tinybench
            throw new Error(
              `Benchmark operation is too fast to measure reliably (execution time < 1ns)`,
            );
          }
          const minimalResults = minimalBench.results[0];
          if (!minimalResults || minimalResults.error) {
            throw new Error(
              `Benchmark too fast to measure reliably: ${minimalResults?.error?.message || 'unknown error'}`,
            );
          }
          // Continue with minimal results
          const taskResult: TaskResult = {
            iterations: minimalResults.latency.samples?.length || 0,
            marginOfError: minimalResults.latency.rme || 0,
            max: minimalResults.latency.max || 0,
            mean: minimalResults.latency.mean || 0,
            metadata: taskData.metadata ?? {},
            min: minimalResults.latency.min || 0,
            name: taskName,
            opsPerSecond: minimalResults.throughput.mean || 0,
            p95: minimalResults.latency.p75 || 0,
            p99: minimalResults.latency.p99 || 0,
            stdDev: minimalResults.latency.sd || 0,
            ...(taskData.tags ? { tags: taskData.tags } : {}),
            variance: minimalResults.latency.variance || 0,
          };
          return taskResult;
        }
        throw error;
      } finally {
        // Always clear the progress interval
        clearInterval(progressInterval);
      }

      // Get results
      const results = bench.results[0];
      if (!results) {
        throw new Error('No benchmark results returned');
      }

      // Check if the task was aborted
      if (results.aborted) {
        // Task was aborted via signal - return minimal valid result with error
        const taskResult: TaskResult = {
          error: new Error('Benchmark aborted by user signal'),
          iterations: results.latency?.samples?.length || 0,
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
        return taskResult;
      }

      // Check if tinybench detected an error during execution
      if (results.error) {
        const errorMessage =
          results.error instanceof Error
            ? results.error.message
            : String(results.error);

        // Handle array length errors for extremely fast operations
        if (errorMessage.includes('Invalid array length')) {
          // Retry with minimal time for extremely fast operations
          // Use same limiting logic but with minimal time for fast ops
          let retryTime: number;
          switch (config.limitBy) {
            case 'all':
            case 'any':
              retryTime = 10;
              break;
            case 'iterations':
              retryTime = 1;
              break;
            case 'time':
              retryTime = 10;
              break;
            default:
              retryTime = 1;
          }

          const minimalBench = new Bench({
            iterations: config.iterations,
            time: retryTime,
            warmupIterations: config.warmup,
            warmupTime: 0,
          });
          minimalBench.add(
            taskName,
            taskData.fn,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - Pending https://github.com/tinylibs/tinybench/pull/364
            signal ? { signal } : undefined,
          );
          await minimalBench.run();
          const minimalResults = minimalBench.results[0];

          if (!minimalResults || minimalResults.error) {
            // If retry also fails, just accept it failed
            throw new Error(
              `Benchmark operation is too fast to measure reliably`,
            );
          }

          // Return minimal results
          const taskResult: TaskResult = {
            iterations: minimalResults.latency.samples?.length || 0,
            marginOfError: minimalResults.latency.rme || 0,
            max: minimalResults.latency.max || 0,
            mean: minimalResults.latency.mean || 0,
            metadata: taskData.metadata ?? {},
            min: minimalResults.latency.min || 0,
            name: taskName,
            opsPerSecond: minimalResults.throughput.mean || 0,
            p95: minimalResults.latency.p75 || 0,
            p99: minimalResults.latency.p99 || 0,
            stdDev: minimalResults.latency.sd || 0,
            ...(taskData.tags ? { tags: taskData.tags } : {}),
            variance: minimalResults.latency.variance || 0,
          };
          return taskResult;
        }

        throw results.error;
      }

      const taskResult: TaskResult = {
        iterations: results.latency.samples?.length || 0, // Use samples array length
        marginOfError: results.latency.rme || 0, // tinybench has relative margin of error
        max: results.latency.max || 0,
        mean: results.latency.mean || 0, // Keep in milliseconds from tinybench
        metadata: taskData.metadata ?? {},
        min: results.latency.min || 0,
        name: taskName,
        opsPerSecond: results.throughput.mean || 0, // tinybench provides hz (operations per second)
        p95: results.latency.p75 || 0, // Use p75 as closest to p95
        p99: results.latency.p99 || 0,
        stdDev: results.latency.sd || 0, // tinybench uses 'sd' for standard deviation
        ...(taskData.tags ? { tags: taskData.tags } : {}),
        variance: results.latency.variance || 0,
      };

      return taskResult;
    } catch (error) {
      const executionError =
        error instanceof Error ? error : new Error(String(error));

      const errorResult: TaskResult = {
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
}
