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
import { calculateStatistics, removeOutliersIQR } from '../stats-utils.js';

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
          // Continue with minimal results - apply outlier removal
          const minimalRawSamples = minimalResults.latency.samples || [];
          const minimalSamplesInNs = minimalRawSamples.map((s) => s * 1e6);
          const minimalCleanedSamples = removeOutliersIQR(minimalSamplesInNs);
          const minimalStats = calculateStatistics(minimalCleanedSamples);

          const taskResult: TaskResult = {
            cv: minimalStats.cv,
            iterations: minimalCleanedSamples.length,
            marginOfError: minimalStats.marginOfError,
            max: minimalStats.max,
            mean: minimalStats.mean,
            metadata: taskData.metadata ?? {},
            min: minimalStats.min,
            name: taskName,
            opsPerSecond: minimalResults.throughput.mean || 0,
            p95: minimalStats.p95,
            p99: minimalStats.p99,
            stdDev: minimalStats.stdDev,
            ...(taskData.tags ? { tags: taskData.tags } : {}),
            variance: minimalStats.variance,
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
          cv: 0,
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

          // Return minimal results - apply outlier removal
          const minimalRawSamples2 = minimalResults.latency.samples || [];
          const minimalSamplesInNs2 = minimalRawSamples2.map((s) => s * 1e6);
          const minimalCleanedSamples2 = removeOutliersIQR(minimalSamplesInNs2);
          const minimalStats2 = calculateStatistics(minimalCleanedSamples2);

          const taskResult: TaskResult = {
            cv: minimalStats2.cv,
            iterations: minimalCleanedSamples2.length,
            marginOfError: minimalStats2.marginOfError,
            max: minimalStats2.max,
            mean: minimalStats2.mean,
            metadata: taskData.metadata ?? {},
            min: minimalStats2.min,
            name: taskName,
            opsPerSecond: minimalResults.throughput.mean || 0,
            p95: minimalStats2.p95,
            p99: minimalStats2.p99,
            stdDev: minimalStats2.stdDev,
            ...(taskData.tags ? { tags: taskData.tags } : {}),
            variance: minimalStats2.variance,
          };
          return taskResult;
        }

        throw results.error;
      }

      // Apply IQR outlier removal to raw samples
      const rawSamples = results.latency.samples || [];
      const samplesInNs = rawSamples.map((s) => s * 1e6); // Convert ms to ns
      const cleanedSamples = removeOutliersIQR(samplesInNs);
      const stats = calculateStatistics(cleanedSamples);

      const taskResult: TaskResult = {
        cv: stats.cv,
        iterations: cleanedSamples.length,
        marginOfError: stats.marginOfError,
        max: stats.max,
        mean: stats.mean,
        metadata: taskData.metadata ?? {},
        min: stats.min,
        name: taskName,
        opsPerSecond: results.throughput.mean || 0, // Keep tinybench's ops/sec
        p95: stats.p95,
        p99: stats.p99,
        stdDev: stats.stdDev,
        ...(taskData.tags ? { tags: taskData.tags } : {}),
        variance: stats.variance,
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
}
