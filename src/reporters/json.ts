/**
 * ModestBench JSON Reporter
 * 
 * Outputs benchmark results in structured JSON format.
 * Suitable for machine processing, CI/CD integration, and data analysis.
 */

import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import type {
  BenchmarkRun,
  TaskResult,
  SuiteResult,
  FileResult,
  ProgressState,
} from '../types/index.js';
import { BaseReporter } from './registry.js';

/**
 * JSON output structure for benchmark results
 */
interface JsonOutput {
  /** ModestBench metadata */
  readonly meta: {
    readonly version: string;
    readonly timestamp: string;
    readonly format: 'modestbench-json';
  };
  /** Complete benchmark run data */
  readonly run: BenchmarkRun;
  /** Additional computed statistics */
  statistics?: {
    fastestTask?: TaskResult;
    slowestTask?: TaskResult;
    averageOpsPerSecond?: number;
    totalIterations?: number;
  };
}

/**
 * JSON reporter for structured output
 */
export class JsonReporter extends BaseReporter {
  private readonly outputPath?: string | undefined;
  private readonly prettyPrint: boolean;
  private readonly includeStatistics: boolean;
  private readonly includeMetadata: boolean;
  private currentRun?: BenchmarkRun;
  private statistics: {
    fastestTask?: TaskResult;
    slowestTask?: TaskResult;
    totalIterations: number;
    totalOpsPerSecond: number;
    taskCount: number;
  } = {
    totalIterations: 0,
    totalOpsPerSecond: 0,
    taskCount: 0,
  };

  constructor(options: {
    outputPath?: string;
    prettyPrint?: boolean;
    includeStatistics?: boolean;
    includeMetadata?: boolean;
  } = {}) {
    super('json', options);
    
    this.outputPath = options.outputPath;
    this.prettyPrint = options.prettyPrint ?? true;
    this.includeStatistics = options.includeStatistics ?? true;
    this.includeMetadata = options.includeMetadata ?? true;
  }

  onStart(run: BenchmarkRun): void {
    this.currentRun = run;
    this.resetStatistics();
  }

  onFileStart(_file: string): void {
    // No-op for JSON reporter
  }

  onSuiteStart(_suite: string): void {
    // No-op for JSON reporter
  }

  onTaskStart(_task: string): void {
    // No-op for JSON reporter
  }

  onTaskResult(result: TaskResult): void {
    if (!result.error) {
      this.updateStatistics(result);
    }
  }

  onSuiteEnd(_result: SuiteResult): void {
    // No-op for JSON reporter
  }

  onFileEnd(_result: FileResult): void {
    // No-op for JSON reporter
  }

  async onEnd(run: BenchmarkRun): Promise<void> {
    const output = this.buildJsonOutput(run);
    
    if (this.outputPath) {
      await this.writeToFile(output);
    } else {
      this.writeToStdout(output);
    }
  }

  onProgress(_state: ProgressState): void {
    // No-op for JSON reporter - we don't output progress in JSON format
  }

  onError(error: Error): void {
    // For JSON reporter, we'll include errors in the final output
    // but we can also log to stderr for immediate feedback
    console.error('JSON Reporter Error:', error.message);
  }

  /**
   * Build the complete JSON output structure
   */
  private buildJsonOutput(run: BenchmarkRun): JsonOutput {
    const output: JsonOutput = {
      meta: {
        version: '0.1.0', // TODO: Get from package.json
        timestamp: new Date().toISOString(),
        format: 'modestbench-json',
      },
      run: this.includeMetadata ? run : this.sanitizeRun(run),
    };

    if (this.includeStatistics) {
      const stats: any = {
        averageOpsPerSecond: this.statistics.taskCount > 0 ? 
          this.statistics.totalOpsPerSecond / this.statistics.taskCount : 0,
        totalIterations: this.statistics.totalIterations,
      };
      
      if (this.statistics.fastestTask) {
        stats.fastestTask = this.statistics.fastestTask;
      }
      
      if (this.statistics.slowestTask) {
        stats.slowestTask = this.statistics.slowestTask;
      }
      
      output.statistics = stats;
    }

    return output;
  }

  /**
   * Remove potentially sensitive metadata from run data
   */
  private sanitizeRun(run: BenchmarkRun): BenchmarkRun {
    const sanitized = {
      ...run,
      environment: {
        ...run.environment,
        env: {}, // Remove environment variables
        hostname: 'redacted', // Remove hostname
      },
    } as BenchmarkRun;

    if (run.git) {
      (sanitized as any).git = {
        ...run.git,
        author: 'redacted', // Remove author info
      };
    }

    return sanitized;
  }

  /**
   * Write JSON output to file
   */
  private async writeToFile(output: JsonOutput): Promise<void> {
    if (!this.outputPath) {
      throw new Error('Output path not specified');
    }

    try {
      // Ensure directory exists
      const dir = dirname(this.outputPath);
      mkdirSync(dir, { recursive: true });

      // Write JSON file
      const jsonString = this.prettyPrint ?
        JSON.stringify(output, null, 2) :
        JSON.stringify(output);

      writeFileSync(this.outputPath, jsonString, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write JSON output to ${this.outputPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Write JSON output to stdout
   */
  private writeToStdout(output: JsonOutput): void {
    const jsonString = this.prettyPrint ?
      JSON.stringify(output, null, 2) :
      JSON.stringify(output);
    
    console.log(jsonString);
  }

  /**
   * Reset statistics tracking
   */
  private resetStatistics(): void {
    this.statistics = {
      totalIterations: 0,
      totalOpsPerSecond: 0,
      taskCount: 0,
    };
  }

  /**
   * Update running statistics with a task result
   */
  private updateStatistics(result: TaskResult): void {
    this.statistics.totalIterations += result.iterations;
    this.statistics.totalOpsPerSecond += result.opsPerSecond;
    this.statistics.taskCount++;

    // Track fastest task
    if (!this.statistics.fastestTask || result.mean < this.statistics.fastestTask.mean) {
      this.statistics.fastestTask = result;
    }

    // Track slowest task
    if (!this.statistics.slowestTask || result.mean > this.statistics.slowestTask.mean) {
      this.statistics.slowestTask = result;
    }
  }

  /**
   * Get the output path (if configured)
   */
  getOutputPath(): string | undefined {
    return this.outputPath;
  }

  /**
   * Check if pretty printing is enabled
   */
  isPrettyPrintEnabled(): boolean {
    return this.prettyPrint;
  }

  /**
   * Check if statistics are included
   */
  areStatisticsIncluded(): boolean {
    return this.includeStatistics;
  }

  /**
   * Check if metadata is included
   */
  isMetadataIncluded(): boolean {
    return this.includeMetadata;
  }
}