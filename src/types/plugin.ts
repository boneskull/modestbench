/**
 * ModestBench Plugin Types
 *
 * Type definitions for third-party reporter plugins. These types are exported
 * from the main package for use by plugin authors.
 */

import type { Reporter } from './interfaces.js';
import type { Logger } from './utility.js';

/**
 * Class constructor for reporter plugins
 *
 * Plugin authors can export a default class matching this signature. The class
 * constructor receives options from the config file and a context object with
 * utilities.
 *
 * @example
 *
 * ```typescript
 * import type { Reporter, ReporterContext } from 'modestbench';
 *
 * interface MyReporterOptions {
 *   verbose?: boolean;
 *   outputFormat?: 'text' | 'markdown';
 * }
 *
 * class MyReporter implements Reporter {
 *   constructor(
 *     private options: MyReporterOptions,
 *     private context: ReporterContext,
 *   ) {}
 *
 *   onStart(run) {
 *     if (this.options.verbose) console.log('Starting');
 *   }
 *   onEnd(run) {
 *     console.log('Done');
 *   }
 *   onError(error) {
 *     console.error(error);
 *   }
 *   onTaskResult(result) {
 *     console.log(
 *       `${result.name}: ${this.context.utils.formatDuration(result.mean)}`,
 *     );
 *   }
 * }
 *
 * export default MyReporter;
 * ```
 *
 * @typeParam TOptions - The shape of the options object (defaults to
 *   Record<string, unknown>)
 */
export interface ReporterClass<
  TOptions extends Record<string, unknown> = Record<string, unknown>,
> {
  new (options?: TOptions, context?: ReporterContext): Reporter;
}

/**
 * Context provided to reporter plugins
 *
 * Contains version information and utility functions that plugins can use.
 */
export interface ReporterContext {
  /**
   * Logger for reporter output
   *
   * Use this instead of console.log/console.error to ensure output respects the
   * user's verbosity settings and uses the correct output streams.
   */
  readonly logger: Logger;

  /**
   * Plugin API version
   *
   * Incremented when breaking changes are made to the plugin API. Currently
   * version 1.
   */
  readonly pluginApiVersion: number;

  /**
   * Utility functions for formatting benchmark data
   */
  readonly utils: ReporterUtils;

  /**
   * ModestBench version
   *
   * Plugins can use this to check compatibility.
   */
  readonly version: string;
}

/**
 * Factory function for creating reporter instances
 *
 * Plugin authors can export a default function matching this signature. The
 * function receives options from the config file and a context object with
 * utilities. Use the generic parameter to define the shape of your options.
 *
 * @example
 *
 * ```typescript
 * import type { ReporterFactory } from 'modestbench';
 *
 * interface MyReporterOptions {
 *   verbose?: boolean;
 *   outputFormat?: 'text' | 'markdown';
 * }
 *
 * const createReporter: ReporterFactory<MyReporterOptions> = (
 *   options,
 *   context,
 * ) => {
 *   return {
 *     onStart(run) {
 *       if (options.verbose) console.log('Starting');
 *     },
 *     onEnd(run) {
 *       console.log('Done');
 *     },
 *     onError(error) {
 *       console.error(error);
 *     },
 *     onTaskResult(result) {
 *       console.log(
 *         `${result.name}: ${context.utils.formatDuration(result.mean)}`,
 *       );
 *     },
 *   };
 * };
 *
 * export default createReporter;
 * ```
 *
 * @typeParam TOptions - The shape of the options object (defaults to
 *   Record<string, unknown>)
 */
export type ReporterFactory<
  TOptions extends Record<string, unknown> = Record<string, unknown>,
> = (
  options: TOptions,
  context: ReporterContext,
) => Promise<Reporter> | Reporter;

/**
 * Union type representing all valid reporter plugin exports
 *
 * A reporter plugin module can export:
 *
 * - A plain Reporter object (simplest form, no options)
 * - A ReporterClass constructor (instantiated with options)
 * - A ReporterFactory function (most flexible, supports async)
 */
export type ReporterPlugin = Reporter | ReporterClass | ReporterFactory;

/**
 * Utility functions available to reporter plugins
 *
 * These functions help format benchmark data consistently.
 */
export interface ReporterUtils {
  /**
   * Format bytes in human-readable format
   *
   * @param bytes - Number of bytes
   * @returns Formatted string (e.g., "1.5 GB", "256 MB")
   */
  formatBytes(bytes: number): string;

  /**
   * Format duration in human-readable format
   *
   * @param nanoseconds - Duration in nanoseconds
   * @returns Formatted string (e.g., "1.23ms", "456.78μs")
   */
  formatDuration(nanoseconds: number): string;

  /**
   * Format operations per second
   *
   * @param opsPerSecond - Operations per second
   * @returns Formatted string (e.g., "1.2M ops/sec", "456K ops/sec")
   */
  formatOpsPerSecond(opsPerSecond: number): string;

  /**
   * Format percentage value
   *
   * @param value - Percentage value
   * @returns Formatted string (e.g., "12.34%")
   */
  formatPercentage(value: number): string;
}
