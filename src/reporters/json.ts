/**
 * ModestBench JSON Reporter
 *
 * Outputs benchmark results in structured JSON format. Suitable for machine
 * processing, CI/CD integration, and data analysis.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BenchmarkRun, TaskResult } from '../types/index.js';

import { ReporterOutputError } from '../errors/index.js';
import { BaseReporter } from '../services/reporter-registry.js';

/**
 * JSON output structure for benchmark results
 */
interface JsonOutput {
  /** ModestBench metadata */
  readonly meta: {
    readonly format: 'modestbench-json';
    readonly timestamp: string;
    readonly version: string;
  };
  /** Complete benchmark run data */
  readonly run: BenchmarkRun;
  /** Additional computed statistics */
  statistics?: {
    averageOpsPerSecond?: number;
    fastestTask?: TaskResult;
    slowestTask?: TaskResult;
    totalIterations?: number;
  };
}

/**
 * Cache the package version at module load time
 *
 * NOTE: This relies on package.json being at the same relative path from both
 * src/ and dist/ directories (../../package.json). If the build output
 * structure changes, this will break.
 */
const cachedPackageVersion = (() => {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkgContent = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgContent) as { version: string };
    return pkg.version;
  } catch {
    // Fallback if package.json cannot be read (shouldn't happen in normal use)
    return 'unknown';
  }
})();

/**
 * JSON reporter for structured output
 */
export class JsonReporter extends BaseReporter {
  private readonly includeMetadata: boolean;

  private readonly includeStatistics: boolean;

  private readonly outputPath?: string | undefined;

  private readonly prettyPrint: boolean;

  private statistics: {
    fastestTask?: TaskResult;
    slowestTask?: TaskResult;
    taskCount: number;
    totalIterations: number;
    totalOpsPerSecond: number;
  } = {
    taskCount: 0,
    totalIterations: 0,
    totalOpsPerSecond: 0,
  };

  constructor(
    options: {
      includeMetadata?: boolean;
      includeStatistics?: boolean;
      outputPath?: string;
      prettyPrint?: boolean;
    } = {},
  ) {
    super('json', options);

    this.outputPath = options.outputPath;
    this.prettyPrint = options.prettyPrint ?? true;
    this.includeStatistics = options.includeStatistics ?? true;
    this.includeMetadata = options.includeMetadata ?? true;
  }

  async onEnd(run: BenchmarkRun): Promise<void> {
    const output = this.buildJsonOutput(run);

    if (this.outputPath) {
      await this.writeToFile(output);
    } else {
      this.writeToStdout(output);
    }
  }

  onError(error: Error): void {
    // For JSON reporter, we'll include errors in the final output
    // but we can also log to stderr for immediate feedback
    console.error('JSON Reporter Error:', error.message);
  }

  onStart(_run: BenchmarkRun): void {
    this.resetStatistics();
  }

  onTaskResult(result: TaskResult): void {
    if (!result.error) {
      this.updateStatistics(result);
    }
  }

  /**
   * Build the complete JSON output structure
   */
  private buildJsonOutput(run: BenchmarkRun): JsonOutput {
    const output: JsonOutput = {
      meta: {
        format: 'modestbench-json',
        timestamp: new Date().toISOString(),
        version: cachedPackageVersion,
      },
      run: this.includeMetadata ? run : this.sanitizeRun(run),
    };

    if (this.includeStatistics) {
      const stats = {
        averageOpsPerSecond:
          this.statistics.taskCount > 0
            ? this.statistics.totalOpsPerSecond / this.statistics.taskCount
            : 0,
        totalIterations: this.statistics.totalIterations,
        ...(this.statistics.fastestTask && {
          fastestTask: this.statistics.fastestTask,
        }),
        ...(this.statistics.slowestTask && {
          slowestTask: this.statistics.slowestTask,
        }),
      };

      output.statistics = stats;
    }

    return output;
  }

  /**
   * Reset statistics tracking
   */
  private resetStatistics(): void {
    this.statistics = {
      taskCount: 0,
      totalIterations: 0,
      totalOpsPerSecond: 0,
    };
  }

  /**
   * Remove potentially sensitive metadata from run data
   */
  private sanitizeRun(run: BenchmarkRun): BenchmarkRun {
    let sanitized = {
      ...run,
      environment: {
        ...run.environment,
        env: {}, // Remove environment variables
        hostname: 'redacted', // Remove hostname
      },
    } as BenchmarkRun;

    if (run.git) {
      sanitized = {
        ...sanitized,
        git: {
          ...run.git,
          author: 'redacted', // Remove author info
        },
      };
    }

    return sanitized;
  }

  /**
   * Update running statistics with a task result
   */
  private updateStatistics(result: TaskResult): void {
    this.statistics.totalIterations += result.iterations;
    this.statistics.totalOpsPerSecond += result.opsPerSecond;
    this.statistics.taskCount++;

    // Track fastest task
    if (
      !this.statistics.fastestTask ||
      result.mean < this.statistics.fastestTask.mean
    ) {
      this.statistics.fastestTask = result;
    }

    // Track slowest task
    if (
      !this.statistics.slowestTask ||
      result.mean > this.statistics.slowestTask.mean
    ) {
      this.statistics.slowestTask = result;
    }
  }

  /**
   * Write JSON output to file
   */
  private async writeToFile(output: JsonOutput): Promise<void> {
    if (!this.outputPath) {
      throw new ReporterOutputError('Output path not specified');
    }

    try {
      // Ensure directory exists
      const dir = dirname(this.outputPath);
      mkdirSync(dir, { recursive: true });

      // Write JSON file
      const jsonString = this.prettyPrint
        ? JSON.stringify(output, null, 2)
        : JSON.stringify(output);

      writeFileSync(this.outputPath, jsonString, 'utf8');
    } catch (error) {
      throw new ReporterOutputError(
        `Failed to write JSON output to ${this.outputPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Write JSON output to stdout
   */
  private writeToStdout(output: JsonOutput): void {
    // Always write to stdout when no output path is specified
    // The quiet flag only affects progress messages (stderr), not data output
    const jsonString = this.prettyPrint
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);

    console.log(jsonString);
  }
}
