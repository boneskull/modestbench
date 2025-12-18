/**
 * ModestBench Configuration Schemas
 *
 * Zod schemas for validating configuration. These schemas are constrained to
 * match the TypeScript types defined in types/core.ts, ensuring type safety and
 * enabling JSON Schema generation.
 */

import * as z from 'zod';

import type { Budget } from '../types/budgets.js';

import { BENCHMARK_FILE_PATTERN } from '../constants.js';
import { parsePercentageString, parseTimeString } from './budget-schema.js';

/**
 * Schema for JSON reporter configuration options
 */
export const jsonReporterConfigSchema = z.object({
  prettyPrint: z
    .boolean()
    .optional()
    .describe('Whether to pretty-print JSON output (default: false)'),
});

/**
 * Schema for reporter-specific configuration
 *
 * Allows typed configuration for known reporters while permitting unknown
 * reporter configs via catchall.
 */
export const reporterConfigSchema = z
  .object({
    json: jsonReporterConfigSchema
      .optional()
      .describe('Configuration options for the JSON reporter'),
  })
  .catchall(z.unknown())
  .describe(
    'Configuration options specific to individual reporters, keyed by reporter name',
  );

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
 * Input schema for budget values (before transformation)
 *
 * Accepts string values like "10ms" or "10%" for human-readable configuration.
 */
const budgetInputSchema = z
  .object({
    absolute: z
      .object({
        maxP99: z
          .union([z.number().positive(), z.string()])
          .optional()
          .describe('Maximum 99th percentile in nanoseconds or time string'),
        maxTime: z
          .union([z.number().positive(), z.string()])
          .optional()
          .describe(
            'Maximum mean time in nanoseconds or time string (e.g., "10ms")',
          ),
        minOpsPerSec: z
          .number()
          .positive()
          .optional()
          .describe('Minimum operations per second'),
      })
      .optional()
      .describe('Absolute performance thresholds'),
    relative: z
      .object({
        maxRegression: z
          .union([z.number().min(0).max(1), z.string()])
          .optional()
          .describe(
            'Maximum regression as decimal (0.1) or percentage string ("10%")',
          ),
      })
      .optional()
      .describe('Relative performance thresholds vs baseline'),
  })
  .describe('Performance budget with absolute and/or relative thresholds');

/**
 * Transform budget values (parse time/percentage strings to numbers)
 *
 * Returns a Budget object with all string values converted to numbers.
 */
const transformBudgetValues = (
  budget: z.infer<typeof budgetInputSchema>,
): Budget => {
  return {
    // Build absolute budget object if present
    absolute: budget.absolute
      ? {
          maxP99:
            budget.absolute.maxP99 !== undefined
              ? typeof budget.absolute.maxP99 === 'string'
                ? parseTimeString(budget.absolute.maxP99)
                : budget.absolute.maxP99
              : undefined,
          maxTime:
            budget.absolute.maxTime !== undefined
              ? typeof budget.absolute.maxTime === 'string'
                ? parseTimeString(budget.absolute.maxTime)
                : budget.absolute.maxTime
              : undefined,
          minOpsPerSec: budget.absolute.minOpsPerSec,
        }
      : undefined,
    // Build relative budget object if present
    relative: budget.relative
      ? {
          maxRegression:
            budget.relative.maxRegression !== undefined
              ? typeof budget.relative.maxRegression === 'string'
                ? parsePercentageString(budget.relative.maxRegression)
                : budget.relative.maxRegression
              : undefined,
        }
      : undefined,
  };
};

/**
 * Budget schema with transform for string-to-number conversion
 *
 * Input: Budget with string values like "10ms" or "10%" Output: Budget with
 * numeric values only
 */
const budgetSchema = budgetInputSchema.transform(transformBudgetValues);

/**
 * Input schema for budgets (nested file → suite → task → budget structure)
 * without transforms - used for JSON Schema generation.
 */
const budgetsRawInputSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), budgetInputSchema)),
);

/**
 * Input schema for budgets with individual budget transforms applied.
 *
 * Used to validate the human-readable nested format from config files.
 */
const budgetsInputSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), budgetSchema)),
);

/**
 * Transform nested budget structure to flat TaskId → Budget mapping
 *
 * @param nested - Nested budgets structure (file → suite → task → budget)
 * @returns Flat budgets map (taskId → budget)
 */
const flattenBudgets = (
  nested: z.infer<typeof budgetsInputSchema>,
): Record<string, Budget> => {
  const flat: Record<string, Budget> = {};

  for (const [file, suites] of Object.entries(nested)) {
    for (const [suite, tasks] of Object.entries(suites)) {
      for (const [task, budget] of Object.entries(tasks)) {
        const taskId = `${file}/${suite}/${task}`;
        flat[taskId] = budget;
      }
    }
  }

  return flat;
};

/**
 * Budgets schema with transform for nested-to-flat conversion
 *
 * Input: { [file]: { [suite]: { [task]: Budget } } } Output: { [taskId]: Budget
 * } where taskId = "file/suite/task"
 */
const budgetsSchema = budgetsInputSchema.transform(flattenBudgets);

/**
 * Shared configuration properties (everything except budgets)
 *
 * These properties are identical between the runtime schema (with transforms)
 * and the JSON Schema generation schema (without transforms).
 */
const baseConfigProperties = {
  $schema: z
    .string()
    .optional()
    .describe(
      'JSON Schema reference for IDE support (not used by ModestBench)',
    ),
  bail: z.boolean().describe('Stop benchmark execution on first failure'),
  baseline: z
    .string()
    .optional()
    .describe(
      'Name of baseline to use for relative budget comparisons. Must match a saved baseline name.',
    ),
  budgetMode: z
    .enum(['fail', 'warn', 'report'])
    .optional()
    .describe(
      'How to handle budget violations: "fail" exits with error (default), "warn" shows warnings, "report" includes in output without failing',
    ),
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
    .optional()
    .describe(
      'Directory path where benchmark results and reports will be written. If not specified, data reporters will write to stdout.',
    ),
  pattern: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .describe(
      `Glob pattern(s) for discovering benchmark files. Can be a single pattern string or array of patterns (e.g., "**/*${BENCHMARK_FILE_PATTERN}")`,
    ),
  profile: z
    .object({
      exclude: z
        .array(z.string())
        .optional()
        .describe('Glob patterns to exclude from profiling results'),
      focus: z
        .array(z.string())
        .optional()
        .describe(
          'Glob patterns to focus on in profiling results. If specified, only matching files will be shown',
        ),
      minCallCount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Minimum number of times a function must be called to be included in results',
        ),
      minExecutionPercent: z
        .number()
        .nonnegative()
        .max(100)
        .default(1.0)
        .describe(
          'Minimum execution percentage threshold for including functions in results',
        ),
      outputFile: z
        .string()
        .optional()
        .describe('Path to write profile report to file'),
      smartDetection: z
        .boolean()
        .default(true)
        .describe(
          'Automatically detect and focus on user code, excluding node_modules and Node.js internals',
        ),
      topN: z
        .number()
        .int()
        .positive()
        .default(25)
        .describe('Maximum number of top functions to show in results'),
    })
    .optional()
    .describe(
      'Configuration for profile command to identify benchmark candidates',
    ),
  quiet: z
    .boolean()
    .describe(
      'Run in quiet mode with minimal console output (only errors and final results)',
    ),
  reporterConfig: reporterConfigSchema,
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
};

/** Description for the budgets field */
const budgetsDescription =
  'Performance budgets organized by file → suite → task. Budgets define acceptable performance thresholds.';

/** Description and metadata for the config schema */
const configSchemaDescription =
  'ModestBench configuration for controlling benchmark discovery, execution, and reporting';
const configSchemaMeta = { title: 'ModestBench Configuration' };

/**
 * Schema for the main ModestBench configuration
 *
 * This is the complete configuration schema used for validating benchmark
 * configuration from all sources (files, CLI args, defaults).
 *
 * The budgets field uses transforms to:
 *
 * 1. Parse string values like "10ms" or "10%" to numbers
 * 2. Flatten nested structure to flat taskId → Budget mapping
 */
const modestBenchConfigSchema = z
  .object({
    ...baseConfigProperties,
    budgets: budgetsSchema.optional().describe(budgetsDescription),
  })
  .strict()
  .describe(configSchemaDescription)
  .meta(configSchemaMeta);

/**
 * Input schema for configuration (without transforms)
 *
 * This schema is used for JSON Schema generation. It validates the same input
 * structure but without transforms, which can't be represented in JSON Schema
 * format.
 */
const modestBenchConfigInputSchema = z
  .object({
    ...baseConfigProperties,
    budgets: budgetsRawInputSchema.optional().describe(budgetsDescription),
  })
  .strict()
  .describe(configSchemaDescription)
  .meta(configSchemaMeta);

/**
 * Partial input schema for JSON Schema generation
 *
 * This is used for generating JSON Schema for IDE autocomplete in config files.
 */
export const partialModestBenchConfigInputSchema =
  modestBenchConfigInputSchema.partial();

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
 * Safely parse and validate a partial configuration object
 *
 * @param config - The configuration object to validate
 * @returns A result object with either success: true and data, or success:
 *   false and error
 */
export const safeParsePartialConfig = (config: unknown) => {
  return partialModestBenchConfigSchema.safeParse(config);
};

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

/**
 * Configuration type after parsing (output type)
 *
 * This is the type you get after parsing a config file - budgets are flattened
 * to taskId keys and string values are converted to numbers.
 */
export type ModestBenchConfig = z.infer<typeof modestBenchConfigSchema>;

/**
 * Configuration type before parsing (input type)
 *
 * This is the type of config files written by users - budgets are nested (file
 * → suite → task) and values can be strings like "10ms" or "10%".
 */
export type ModestBenchConfigInput = z.input<typeof modestBenchConfigSchema>;
