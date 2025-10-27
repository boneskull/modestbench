import { z } from 'zod';

import type { BaselineStorage } from '../types/budgets.js';

/**
 * Zod schema for budget configuration
 *
 * @packageDocumentation
 */

/**
 * Parse time string to nanoseconds Supports: "10ms", "5s", "100us", "50ns"
 */
export const parseTimeString = (value: string): number => {
  const match = value.match(/^(\d+(?:\.\d+)?)(ns|us|ms|s)$/i);
  if (!match) {
    throw new Error(
      `Invalid time format: "${value}". Expected format like "10ms", "5s", "100us", "50ns"`,
    );
  }

  const num = parseFloat(match[1]!);
  const unit = match[2]!.toLowerCase();

  const multipliers = {
    ms: 1_000_000,
    ns: 1,
    s: 1_000_000_000,
    us: 1_000,
  };

  return num * multipliers[unit as keyof typeof multipliers];
};

/**
 * Parse percentage string to decimal Supports: "10%", "5.5%"
 *
 * Note: Does not round result - preserves full precision from input
 */
export const parsePercentageString = (value: string): number => {
  const match = value.match(/^(\d+(?:\.\d+)?)%$/);
  if (!match) {
    throw new Error(
      `Invalid percentage format: "${value}". Expected format like "10%", "5.5%"`,
    );
  }

  return parseFloat(match[1]!) / 100;
};

/**
 * Time or nanoseconds
 */
const timeSchema = z
  .union([
    z.number().int().nonnegative().describe('Time in nanoseconds'),
    z
      .string()
      .transform(parseTimeString)
      .describe('Time string (e.g., "10ms")'),
  ])
  .describe('Time value as nanoseconds or time string');

/**
 * Percentage or decimal
 */
const percentageSchema = z
  .union([
    z
      .number()
      .min(0)
      .max(1)
      .describe('Percentage as decimal (e.g., 0.1 for 10%)'),
    z
      .string()
      .transform(parsePercentageString)
      .describe('Percentage string (e.g., "10%")'),
  ])
  .describe('Percentage value as decimal or percentage string');

/**
 * Absolute budget schema
 */
const absoluteBudgetSchema = z
  .object({
    maxP99: timeSchema
      .optional()
      .describe('Maximum 99th percentile execution time'),
    maxTime: timeSchema.optional().describe('Maximum mean execution time'),
    minOpsPerSec: z
      .number()
      .positive()
      .optional()
      .describe('Minimum operations per second'),
  })
  .describe('Absolute performance budget thresholds');

/**
 * Relative budget schema
 */
const relativeBudgetSchema = z
  .object({
    baseline: z
      .string()
      .optional()
      .describe('Name of baseline to compare against'),
    maxRegression: percentageSchema
      .optional()
      .describe('Maximum allowed performance regression'),
  })
  .describe('Relative performance budget thresholds compared to baseline');

/**
 * Complete budget schema
 */
export const budgetSchema = z
  .object({
    absolute: absoluteBudgetSchema
      .optional()
      .describe('Absolute performance thresholds'),
    relative: relativeBudgetSchema
      .optional()
      .describe('Relative performance thresholds'),
  })
  .describe('Performance budget configuration');

/**
 * Baseline reference schema
 *
 * Note: This validates and transforms to branded types (RunId, TaskId). The
 * transforms are safe as they only add compile-time type information.
 */
const baselineReferenceSchema = z
  .object({
    branch: z.string().optional().describe('Git branch name'),
    commit: z
      .string()
      .length(40)
      .regex(/^[0-9a-f]{40}$/)
      .optional()
      .describe('Full Git commit hash (40 hex characters)'),
    date: z.coerce.date().describe('Date baseline was created'),
    name: z.string().describe('Baseline name identifier'),
    runId: z
      .string()
      .length(7)
      .regex(/^[0-9a-z]{7}$/)
      .describe('Benchmark run ID (7 lowercase alphanumeric characters)'),
    summary: z
      .record(
        z.string(),
        z.object({
          mean: z.number().describe('Mean execution time in nanoseconds'),
          opsPerSecond: z.number().describe('Operations per second'),
          p99: z
            .number()
            .optional()
            .describe('99th percentile execution time in nanoseconds'),
        }),
      )
      .describe('Summary of benchmark results for each task'),
  })
  .describe('Named baseline reference with benchmark results summary');

/**
 * Baseline storage schema
 */
export const baselineStorageSchema = z
  .object({
    baselines: z
      .record(z.string(), baselineReferenceSchema)
      .describe('Map of baseline names to baseline references'),
    default: z.string().optional().describe('Default baseline name'),
    version: z.string().describe('Schema version'),
  })
  .describe('Baseline storage file format');

/**
 * Validate baseline storage
 *
 * Note: The parsed data contains plain strings that are cast to branded types
 * (RunId, TaskId). This is safe because branded types are compile-time only
 * constructs.
 */
export const validateBaselineStorage = (storage: unknown): BaselineStorage => {
  const parsed = baselineStorageSchema.parse(storage);
  // Cast is safe: branded types are erased at runtime
  return parsed as unknown as BaselineStorage;
};
