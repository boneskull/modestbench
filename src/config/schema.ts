/**
 * ModestBench Configuration Schemas
 *
 * Zod schemas for validating configuration. These schemas are constrained to
 * match the TypeScript types defined in types/core.ts, ensuring type safety and
 * enabling JSON Schema generation.
 */

import * as z from 'zod';

import type { ModestBenchConfig } from '../types/core.js';

import { BENCHMARK_FILE_PATTERN } from '../constants.js';

/**
 * Schema for threshold configuration
 *
 * Defines performance assertion thresholds for benchmark validation.
 */
const thresholdConfigSchema = z
  .object({
    maxMarginOfError: z
      .number()
      .positive()
      .describe('Maximum allowed margin of error as a percentage')
      .optional(),
    maxMean: z
      .number()
      .positive()
      .describe('Maximum allowed mean execution time in nanoseconds')
      .optional(),
    maxP95: z
      .number()
      .positive()
      .describe('Maximum allowed 95th percentile execution time in nanoseconds')
      .optional(),
    maxP99: z
      .number()
      .positive()
      .describe('Maximum allowed 99th percentile execution time in nanoseconds')
      .optional(),
    maxStdDev: z
      .number()
      .positive()
      .describe('Maximum allowed standard deviation in nanoseconds')
      .optional(),
    minOpsPerSecond: z
      .number()
      .positive()
      .describe('Minimum required operations per second')
      .optional(),
  })
  .strict()
  .describe('Performance assertion thresholds for benchmark validation')
  .meta({
    title: 'Threshold Configuration',
  });

/**
 * Schema for the main ModestBench configuration
 *
 * This is the complete configuration schema used for validating benchmark
 * configuration from all sources (files, CLI args, defaults).
 */
const modestBenchConfigSchema = z
  .object({
    $schema: z
      .string()
      .optional()
      .describe(
        'JSON Schema reference for IDE support (not used by ModestBench)',
      ),
    bail: z.boolean().describe('Stop benchmark execution on first failure'),
    exclude: z
      .array(z.string())
      .describe(
        'Glob patterns to exclude from benchmark file discovery (e.g., "node_modules/**", ".git/**")',
      ),
    excludeTags: z
      .array(z.string())
      .describe(
        'Tags to exclude from benchmark execution. Benchmarks matching any of these tags will be skipped.',
      ),
    iterations: z
      .number()
      .int()
      .positive()
      .describe(
        'Default number of iterations to run for each benchmark task. Higher values provide more accurate statistics but take longer to execute.',
      ),
    limitBy: z
      .enum(['time', 'iterations', 'any', 'all'])
      .describe(
        'How to limit benchmark execution: "time" stops after time limit, "iterations" stops after iteration count, "any" stops at whichever comes first, "all" runs until both limits are reached',
      ),
    metadata: z
      .record(z.string(), z.unknown())
      .describe(
        'Custom metadata to attach to benchmark runs. Can include project name, version, environment details, etc.',
      ),
    outputDir: z
      .string()
      .min(1)
      .describe(
        'Directory path where benchmark results and reports will be written',
      ),
    pattern: z
      .union([z.string().min(1), z.array(z.string().min(1))])
      .describe(
        `Glob pattern(s) for discovering benchmark files. Can be a single pattern string or array of patterns (e.g., "**/*${BENCHMARK_FILE_PATTERN}")`,
      ),
    quiet: z
      .boolean()
      .describe(
        'Run in quiet mode with minimal console output (only errors and final results)',
      ),
    reporterConfig: z
      .record(z.string(), z.unknown())
      .describe(
        'Configuration options specific to individual reporters, keyed by reporter name',
      ),
    reporters: z
      .array(z.string())
      .min(1)
      .describe(
        'List of reporter names to use for output. Available reporters: "human", "json", "csv"',
      ),
    tags: z
      .array(z.string())
      .describe(
        'Tags to filter which benchmarks to run. If empty, all benchmarks are included. Only benchmarks with matching tags will execute.',
      ),
    thresholds: thresholdConfigSchema,
    time: z
      .number()
      .int()
      .positive()
      .describe(
        'Maximum time to spend on each benchmark task in milliseconds. Tasks will run at least until this duration or iteration count is reached, depending on limitBy setting.',
      ),
    timeout: z
      .number()
      .int()
      .positive()
      .describe(
        'Timeout for individual benchmark tasks in milliseconds. Tasks exceeding this duration will be terminated and marked as failed.',
      ),
    verbose: z
      .boolean()
      .describe(
        'Enable verbose output. Provides more detailed console output including progress, intermediate results, and diagnostic information',
      ),
    warmup: z
      .number()
      .int()
      .nonnegative()
      .describe(
        'Number of warmup iterations to run before measurement begins. Warmup helps stabilize performance by allowing JIT compilation and caching to occur.',
      ),
  })
  .strict()
  .describe(
    'ModestBench configuration for controlling benchmark discovery, execution, and reporting',
  )
  .meta({
    title: 'ModestBench Configuration',
  });

/**
 * Validate a partial configuration object
 *
 * This is used for validating configuration from files or CLI args before
 * merging with defaults.
 */
export const partialModestBenchConfigSchema: z.ZodType<
  Partial<ModestBenchConfig>
> = modestBenchConfigSchema.partial();

/**
 * Safely parse and validate a configuration object
 *
 * @param config - The configuration object to validate
 * @returns A result object with either success: true and data, or success:
 *   false and error
 */
export const safeParseConfig = (config: unknown) => {
  return modestBenchConfigSchema.safeParse(config);
};
