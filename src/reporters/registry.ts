/**
 * ModestBench Reporter Registry
 *
 * Plugin-based system for managing benchmark output formatters.
 * Supports registration, retrieval, and lifecycle management of reporters.
 */

import type {
  Reporter,
  BenchmarkRun,
  TaskResult,
  SuiteResult,
  FileResult,
  ProgressState,
} from '../types/index.js';
import type { ReporterRegistry } from '../core/engine.js';

/**
 * Base abstract reporter class providing common functionality
 */
export abstract class BaseReporter implements Reporter {
  protected readonly name: string;
  protected readonly options: Record<string, unknown>;

  constructor(name: string, options: Record<string, unknown> = {}) {
    this.name = name;
    this.options = options;
  }

  /**
   * Called when benchmark run starts
   */
  abstract onStart(run: BenchmarkRun): void | Promise<void>;

  /**
   * Called when a file starts execution
   */
  abstract onFileStart(file: string): void | Promise<void>;

  /**
   * Called when a suite starts execution
   */
  abstract onSuiteStart(suite: string): void | Promise<void>;

  /**
   * Called when a task starts execution
   */
  abstract onTaskStart(task: string): void | Promise<void>;

  /**
   * Called when a task completes
   */
  abstract onTaskResult(result: TaskResult): void | Promise<void>;

  /**
   * Called when a suite completes
   */
  abstract onSuiteEnd(result: SuiteResult): void | Promise<void>;

  /**
   * Called when a file completes
   */
  abstract onFileEnd(result: FileResult): void | Promise<void>;

  /**
   * Called when benchmark run completes
   */
  abstract onEnd(run: BenchmarkRun): void | Promise<void>;

  /**
   * Called for progress updates
   */
  abstract onProgress(state: ProgressState): void | Promise<void>;

  /**
   * Called when an error occurs
   */
  abstract onError(error: Error): void | Promise<void>;

  /**
   * Get reporter name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get reporter options
   */
  getOptions(): Record<string, unknown> {
    return { ...this.options };
  }

  /**
   * Utility method to format duration in human-readable format
   */
  protected formatDuration(nanoseconds: number): string {
    if (nanoseconds < 1000) {
      return `${nanoseconds.toFixed(2)}ns`;
    } else if (nanoseconds < 1000000) {
      return `${(nanoseconds / 1000).toFixed(2)}μs`;
    } else if (nanoseconds < 1000000000) {
      return `${(nanoseconds / 1000000).toFixed(2)}ms`;
    } else {
      return `${(nanoseconds / 1000000000).toFixed(2)}s`;
    }
  }

  /**
   * Utility method to format operations per second
   */
  protected formatOpsPerSecond(opsPerSecond: number): string {
    if (opsPerSecond < 1000) {
      return `${opsPerSecond.toFixed(2)} ops/sec`;
    } else if (opsPerSecond < 1000000) {
      return `${(opsPerSecond / 1000).toFixed(2)}K ops/sec`;
    } else if (opsPerSecond < 1000000000) {
      return `${(opsPerSecond / 1000000).toFixed(2)}M ops/sec`;
    } else {
      return `${(opsPerSecond / 1000000000).toFixed(2)}B ops/sec`;
    }
  }

  /**
   * Utility method to format percentage
   */
  protected formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  /**
   * Utility method to safely handle async operations
   */
  protected async safeAsync<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      await this.onError(
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }
}

/**
 * Reporter registry implementation for managing multiple reporters
 */
export class ModestBenchReporterRegistry implements ReporterRegistry {
  private readonly reporters: Map<string, Reporter> = new Map();

  /**
   * Register a reporter with a unique name
   */
  register(name: string, reporter: Reporter): void {
    if (this.reporters.has(name)) {
      throw new Error(`Reporter with name "${name}" is already registered`);
    }
    this.reporters.set(name, reporter);
  }

  /**
   * Get a reporter by name
   */
  get(name: string): Reporter | undefined {
    return this.reporters.get(name);
  }

  /**
   * Get all registered reporters
   */
  getAll(): Record<string, Reporter> {
    const result: Record<string, Reporter> = {};
    this.reporters.forEach((reporter, name) => {
      result[name] = reporter;
    });
    return result;
  }

  /**
   * Get multiple reporters by names
   */
  getByNames(names: string[]): Reporter[] {
    const result: Reporter[] = [];
    const missing: string[] = [];

    for (const name of names) {
      const reporter = this.reporters.get(name);
      if (reporter) {
        result.push(reporter);
      } else {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Unknown reporters: ${missing.join(', ')}. Available: ${Array.from(this.reporters.keys()).join(', ')}`
      );
    }

    return result;
  }

  /**
   * Check if a reporter is registered
   */
  has(name: string): boolean {
    return this.reporters.has(name);
  }

  /**
   * Unregister a reporter
   */
  unregister(name: string): boolean {
    return this.reporters.delete(name);
  }

  /**
   * Clear all registered reporters
   */
  clear(): void {
    this.reporters.clear();
  }

  /**
   * Get list of registered reporter names
   */
  getNames(): string[] {
    return Array.from(this.reporters.keys());
  }

  /**
   * Get count of registered reporters
   */
  size(): number {
    return this.reporters.size;
  }
}

/**
 * Composite reporter that broadcasts events to multiple reporters
 */
export class CompositeReporter extends BaseReporter {
  private readonly reporters: Reporter[];

  constructor(reporters: Reporter[]) {
    super('composite', {});
    this.reporters = [...reporters];
  }

  async onStart(run: BenchmarkRun): Promise<void> {
    await this.broadcastAsync('onStart', run);
  }

  async onFileStart(file: string): Promise<void> {
    await this.broadcastAsync('onFileStart', file);
  }

  async onSuiteStart(suite: string): Promise<void> {
    await this.broadcastAsync('onSuiteStart', suite);
  }

  async onTaskStart(task: string): Promise<void> {
    await this.broadcastAsync('onTaskStart', task);
  }

  async onTaskResult(result: TaskResult): Promise<void> {
    await this.broadcastAsync('onTaskResult', result);
  }

  async onSuiteEnd(result: SuiteResult): Promise<void> {
    await this.broadcastAsync('onSuiteEnd', result);
  }

  async onFileEnd(result: FileResult): Promise<void> {
    await this.broadcastAsync('onFileEnd', result);
  }

  async onEnd(run: BenchmarkRun): Promise<void> {
    await this.broadcastAsync('onEnd', run);
  }

  async onProgress(state: ProgressState): Promise<void> {
    await this.broadcastAsync('onProgress', state);
  }

  async onError(error: Error): Promise<void> {
    await this.broadcastAsync('onError', error);
  }

  /**
   * Add a reporter to the composite
   */
  addReporter(reporter: Reporter): void {
    this.reporters.push(reporter);
  }

  /**
   * Remove a reporter from the composite
   */
  removeReporter(reporter: Reporter): boolean {
    const index = this.reporters.indexOf(reporter);
    if (index >= 0) {
      this.reporters.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all reporters in the composite
   */
  getReporters(): Reporter[] {
    return [...this.reporters];
  }

  /**
   * Broadcast an event to all reporters with error handling
   */
  private async broadcastAsync(
    method: keyof Reporter,
    ...args: any[]
  ): Promise<void> {
    const promises = this.reporters.map(async reporter => {
      try {
        const result = (reporter[method] as any)(...args);
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (error) {
        // Handle reporter-specific errors without affecting others
        console.error(
          `Reporter error in ${reporter.constructor.name}.${method}:`,
          error
        );
      }
    });

    await Promise.all(promises);
  }
}
