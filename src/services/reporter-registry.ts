/**
 * ModestBench Reporter Registry
 *
 * Plugin-based system for managing benchmark output formatters. Supports
 * registration, retrieval, and lifecycle management of reporters.
 */

import type {
  BenchmarkRun,
  FileResult,
  ProgressState,
  Reporter,
  ReporterRegistry,
  SuiteResult,
  TaskResult,
} from '../types/index.js';

import {
  ReporterAlreadyRegisteredError,
  UnknownReporterError,
} from '../errors/index.js';

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
   * Utility method to format duration in human-readable format
   */
  protected static formatDuration(this: void, nanoseconds: number): string {
    if (nanoseconds < 1000) {
      return `${nanoseconds.toFixed(2)}ns`;
    } else if (nanoseconds < 1_000_000) {
      return `${(nanoseconds / 1000).toFixed(2)}μs`;
    } else if (nanoseconds < 1_000_000_000) {
      return `${(nanoseconds / 1_000_000).toFixed(2)}ms`;
    } else {
      return `${(nanoseconds / 1_000_000_000).toFixed(2)}s`;
    }
  }

  /**
   * Utility method to format operations per second
   */
  protected static formatOpsPerSecond(
    this: void,
    opsPerSecond: number,
  ): string {
    if (opsPerSecond < 1000) {
      return `${opsPerSecond.toFixed(2)} ops/sec`;
    } else if (opsPerSecond < 1_000_000) {
      return `${(opsPerSecond / 1000).toFixed(2)}K ops/sec`;
    } else if (opsPerSecond < 1_000_000_000) {
      return `${(opsPerSecond / 1_000_000).toFixed(2)}M ops/sec`;
    } else {
      return `${(opsPerSecond / 1_000_000_000).toFixed(2)}B ops/sec`;
    }
  }

  /**
   * Utility method to format percentage
   */
  protected static formatPercentage(this: void, value: number): string {
    return `${value.toFixed(2)}%`;
  }

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
   * Called when benchmark run completes
   */
  abstract onEnd(run: BenchmarkRun): Promise<void> | void;

  /**
   * Called when an error occurs
   */
  abstract onError(error: Error): Promise<void> | void;

  /**
   * Called when benchmark run starts
   */
  abstract onStart(run: BenchmarkRun): Promise<void> | void;

  /**
   * Called when a task completes
   */
  abstract onTaskResult(result: TaskResult): Promise<void> | void;
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

  /**
   * Add a reporter to the composite
   *
   * Intended for programmatic usage.
   */
  addReporter(reporter: Reporter): void {
    this.reporters.push(reporter);
  }

  /**
   * Get all reporters in the composite
   *
   * Intended for programmatic usage.
   */
  getReporters(): Reporter[] {
    return [...this.reporters];
  }

  override async onEnd(run: BenchmarkRun): Promise<void> {
    await this.broadcastAsync('onEnd', run);
  }

  override async onError(error: Error): Promise<void> {
    await this.broadcastAsync('onError', error);
  }

  async onFileEnd(result: FileResult): Promise<void> {
    await this.broadcastAsync('onFileEnd', result);
  }

  async onFileStart(file: string): Promise<void> {
    await this.broadcastAsync('onFileStart', file);
  }

  async onProgress(state: ProgressState): Promise<void> {
    await this.broadcastAsync('onProgress', state);
  }

  override async onStart(run: BenchmarkRun): Promise<void> {
    await this.broadcastAsync('onStart', run);
  }

  async onSuiteEnd(result: SuiteResult): Promise<void> {
    await this.broadcastAsync('onSuiteEnd', result);
  }

  async onSuiteStart(suite: string): Promise<void> {
    await this.broadcastAsync('onSuiteStart', suite);
  }

  override async onTaskResult(result: TaskResult): Promise<void> {
    await this.broadcastAsync('onTaskResult', result);
  }

  async onTaskStart(task: string): Promise<void> {
    await this.broadcastAsync('onTaskStart', task);
  }

  /**
   * Remove a reporter from the composite
   *
   * Intended for programmatic usage.
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
   * Broadcast an event to all reporters with error handling
   */
  private async broadcastAsync(
    method: keyof Reporter,

    ...args: unknown[]
  ): Promise<void> {
    const promises = this.reporters.map(async (reporter) => {
      try {
        if (typeof reporter[method] === 'function') {
          const result = (
            reporter[method] as (...args: unknown[]) => unknown
          ).call(reporter, ...args);
          if (
            result &&
            typeof result === 'object' &&
            'then' in result &&
            typeof result.then === 'function'
          ) {
            await (result as Promise<void>);
          }
        }
      } catch (error) {
        // Handle reporter-specific errors without affecting others
        console.error(
          `Reporter error in ${reporter.constructor.name}.${method}:`,
          error,
        );
      }
    });

    await Promise.all(promises);
  }
}

/**
 * Reporter registry implementation for managing multiple reporters
 */
export class ModestBenchReporterRegistry implements ReporterRegistry {
  private readonly reporters: Map<string, Reporter> = new Map();

  /**
   * Clear all registered reporters
   */
  clear(): void {
    this.reporters.clear();
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
      throw new UnknownReporterError(
        `Unknown reporters: ${missing.join(', ')}. Available: ${Array.from(this.reporters.keys()).join(', ')}`,
      );
    }

    return result;
  }

  /**
   * Get list of registered reporter names
   */
  getNames(): string[] {
    return Array.from(this.reporters.keys());
  }

  /**
   * Check if a reporter is registered
   */
  has(name: string): boolean {
    return this.reporters.has(name);
  }

  /**
   * Register a reporter with a unique name
   */
  register(name: string, reporter: Reporter): void {
    if (this.reporters.has(name)) {
      throw new ReporterAlreadyRegisteredError(
        `Reporter with name "${name}" is already registered`,
      );
    }
    this.reporters.set(name, reporter);
  }

  /**
   * Get count of registered reporters
   */
  size(): number {
    return this.reporters.size;
  }

  /**
   * Unregister a reporter
   */
  unregister(name: string): boolean {
    return this.reporters.delete(name);
  }
}
