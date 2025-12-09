/**
 * TinybenchEngine - Tinybench-specific benchmark execution implementation
 *
 * Concrete implementation of ModestBenchEngine using the tinybench library for
 * benchmark execution and measurement.
 */

import { Bench, type TaskResult as TinybenchTaskResult } from 'tinybench';

import type {
  BenchmarkTask,
  ModestBenchConfig,
  Reporter,
  TaskResult,
} from '../../types/index.js';

import {
  BenchmarkExecutionError,
  OperationTooFastError,
  StructureValidationError,
} from '../../errors/index.js';
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
        throw new StructureValidationError(
          'Benchmark task must have a "fn" function property',
        );
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
        retainSamples: true, // Required in tinybench v6+ to access samples for custom stats
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
            retainSamples: true,
            time: retryTime,
            warmupIterations: config.warmup,
            warmupTime: 0,
          });
          minimalBench.add(
            taskName,
            taskData.fn,
            signal ? { signal } : undefined,
          );
          try {
            await minimalBench.run();
          } catch {
            // If still failing, the operation is too fast even for tinybench
            throw new OperationTooFastError(
              `Benchmark operation is too fast to measure reliably (execution time < 1ns)`,
            );
          }
          const minimalResults = minimalBench.results[0];
          // Handle discriminated union: check state for error/completion
          if (!minimalResults || minimalResults.state === 'errored') {
            const errorMsg =
              minimalResults?.state === 'errored'
                ? minimalResults.error.message
                : 'unknown error';
            throw new OperationTooFastError(
              `Benchmark too fast to measure reliably: ${errorMsg}`,
            );
          }
          // Extract stats from completed result
          const taskResultFromMinimal =
            this.extractTaskResultFromTinybenchResult(
              taskName,
              taskData,
              minimalResults,
            );
          if (taskResultFromMinimal) {
            return taskResultFromMinimal;
          }
          throw new OperationTooFastError(
            `Benchmark too fast to measure reliably: no statistics available`,
          );
        }
        throw error;
      } finally {
        // Always clear the progress interval
        clearInterval(progressInterval);
      }

      // Get results
      const results = bench.results[0];
      if (!results) {
        throw new BenchmarkExecutionError('No benchmark results returned');
      }

      // Handle discriminated union based on state
      switch (results.state) {
        case 'aborted':
          // Task was aborted via signal - return minimal valid result marked as aborted
          return {
            aborted: true,
            cv: 0,
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

        case 'aborted-with-statistics': {
          // Aborted but has partial stats - use them
          const taskResultFromAborted =
            this.extractTaskResultFromTinybenchResult(
              taskName,
              taskData,
              results,
            );
          if (taskResultFromAborted) {
            return { ...taskResultFromAborted, aborted: true };
          }
          // Fall through to return minimal aborted result
          return {
            aborted: true,
            cv: 0,
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
        }

        case 'errored': {
          const errorMessage = results.error.message;

          // Handle array length errors for extremely fast operations
          if (errorMessage.includes('Invalid array length')) {
            // Retry with minimal time for extremely fast operations
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
              retainSamples: true,
              time: retryTime,
              warmupIterations: config.warmup,
              warmupTime: 0,
            });
            minimalBench.add(
              taskName,
              taskData.fn,
              signal ? { signal } : undefined,
            );
            await minimalBench.run();
            const minimalResults = minimalBench.results[0];

            if (!minimalResults || minimalResults.state === 'errored') {
              throw new OperationTooFastError(
                `Benchmark operation is too fast to measure reliably`,
              );
            }

            const retryTaskResult = this.extractTaskResultFromTinybenchResult(
              taskName,
              taskData,
              minimalResults,
            );
            if (retryTaskResult) {
              return retryTaskResult;
            }
            throw new OperationTooFastError(
              `Benchmark operation is too fast to measure reliably`,
            );
          }

          throw results.error;
        }

        case 'completed': {
          // Normal completion - extract full stats
          const taskResultFromCompleted =
            this.extractTaskResultFromTinybenchResult(
              taskName,
              taskData,
              results,
            );
          if (taskResultFromCompleted) {
            return taskResultFromCompleted;
          }
          throw new BenchmarkExecutionError(
            'Completed benchmark but no statistics available',
          );
        }

        case 'not-started':
        case 'started':
          throw new BenchmarkExecutionError(
            `Unexpected benchmark state: ${results.state}`,
          );

        default:
          // Exhaustiveness check
          throw new BenchmarkExecutionError(
            `Unknown benchmark state: ${(results as TinybenchTaskResult).state}`,
          );
      }
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
   * Extract TaskResult from a tinybench result that has statistics
   *
   * Handles the discriminated union types from tinybench v6+
   */
  private extractTaskResultFromTinybenchResult(
    taskName: string,
    taskData: BenchmarkTask,
    result: TinybenchTaskResult,
  ): null | TaskResult {
    // Only states with statistics: 'completed' and 'aborted-with-statistics'
    if (
      result.state !== 'completed' &&
      result.state !== 'aborted-with-statistics'
    ) {
      return null;
    }

    // Apply IQR outlier removal to raw samples
    // Note: samples may be undefined if retainSamples wasn't enabled
    const rawSamples = result.latency.samples ?? [];
    if (rawSamples.length === 0) {
      // Fall back to using tinybench's calculated stats directly
      return {
        cv: result.latency.rme, // Use relative margin of error as CV approximation
        iterations: result.latency.samplesCount,
        marginOfError: result.latency.moe,
        max: result.latency.max,
        mean: result.latency.mean,
        metadata: taskData.metadata ?? {},
        min: result.latency.min,
        name: taskName,
        opsPerSecond: result.throughput.mean || 0,
        p95: result.latency.p99, // tinybench v6 doesn't have p95, use p99
        p99: result.latency.p99,
        stdDev: result.latency.sd,
        ...(taskData.tags ? { tags: taskData.tags } : {}),
        variance: result.latency.variance,
      };
    }

    const samplesInNs = rawSamples.map((s: number) => s * 1e6); // Convert ms to ns
    const cleanedSamples = removeOutliersIQR(samplesInNs);
    const stats = calculateStatistics(cleanedSamples);

    return {
      cv: stats.cv,
      iterations: cleanedSamples.length,
      marginOfError: stats.marginOfError,
      max: stats.max,
      mean: stats.mean,
      metadata: taskData.metadata ?? {},
      min: stats.min,
      name: taskName,
      opsPerSecond: result.throughput.mean || 0,
      p95: stats.p95,
      p99: stats.p99,
      stdDev: stats.stdDev,
      ...(taskData.tags ? { tags: taskData.tags } : {}),
      variance: stats.variance,
    };
  }
}
