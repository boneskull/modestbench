/**
 * ModestBench Benchmark File Schema
 *
 * Zod schemas for validating and parsing benchmark file structure. Supports
 * both traditional suite-based format and simplified flat task definitions.
 */

import { z } from 'zod';

import type {
  BenchmarkDefinition,
  BenchmarkSuite,
  BenchmarkTask,
} from '../types/index.js';

/**
 * Zod schema for the full benchmark task object structure
 */
const benchmarkTaskObjectSchema = z.object({
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Task-specific configuration overrides'),
  fn: z.function().describe('The function to benchmark'),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Custom metadata associated with the task'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Tags for filtering and grouping tasks'),
});

/**
 * Zod schema for a benchmark task - accepts either:
 *
 * 1. A full task object with fn, config, metadata, tags
 * 2. A function directly (shorthand syntax)
 */
const benchmarkTaskSchema: z.ZodType<BenchmarkTask> = z
  .union([benchmarkTaskObjectSchema, benchmarkTaskObjectSchema.shape.fn])
  .transform((value) => {
    // If it's a function, wrap it in a task object
    if (typeof value === 'function') {
      return { fn: value };
    }
    // Otherwise it's already a full task object, return as-is
    return value;
  })
  .pipe(benchmarkTaskObjectSchema)
  .describe('A single benchmark task definition (object or function)');

/**
 * Zod schema for validating benchmark suite structure
 */
const benchmarkSuiteSchema: z.ZodType<BenchmarkSuite> = z
  .object({
    benchmarks: z
      .record(z.string(), benchmarkTaskSchema)
      .describe('Map of benchmark task names to task definitions'),
    config: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Suite-specific configuration overrides'),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Custom metadata associated with the suite'),
    setup: z
      .function()
      .optional()
      .describe('Function to run before all benchmarks in the suite'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Tags for filtering and grouping suites'),
    teardown: z
      .function()
      .optional()
      .describe('Function to run after all benchmarks in the suite'),
  })
  .describe('A benchmark suite containing multiple tasks');

/**
 * Zod schema for validating benchmark file structure.
 *
 * Supports two formats:
 *
 * 1. Traditional: { suites: { 'Suite Name': { benchmarks: {...} } } }
 * 2. Simplified: { 'task name': () => {...} } or { 'task name': { fn: () => {...}
 *    } }
 *
 * The simplified format is automatically transformed to the traditional format
 * with a default suite named after the file.
 */
export const benchmarkFileSchema = z
  .union([
    // Traditional format: has a 'suites' property
    z.object({
      config: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('File-level configuration overrides'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata associated with the file'),
      suites: z
        .record(z.string(), benchmarkSuiteSchema)
        .refine((suites) => Object.keys(suites).length > 0, {
          message: 'At least one suite is required',
        })
        .describe('Map of suite names to suite definitions'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for filtering and grouping files'),
    }),
    // Simplified flat format: direct task definitions
    z.record(z.string(), z.unknown()),
  ])
  .transform((value) => {
    // Check if this is traditional format (has suites property)
    if ('suites' in value && value.suites !== undefined) {
      // Already in traditional format, return as-is
      return value as BenchmarkDefinition;
    }

    // This is flat format - transform to traditional format
    // Extract known file-level properties
    const config = 'config' in value ? value.config : undefined;
    const metadata = 'metadata' in value ? value.metadata : undefined;
    const tags = 'tags' in value ? value.tags : undefined;

    // Collect task definitions (everything except reserved properties)
    const reservedKeys = new Set(['config', 'metadata', 'suites', 'tags']);
    const tasks: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value)) {
      if (!reservedKeys.has(key)) {
        tasks[key] = val;
      }
    }

    // If no tasks found, return an empty suites object
    // This will fail validation in the subsequent superRefine
    if (Object.keys(tasks).length === 0) {
      const result: BenchmarkDefinition = {
        suites: {},
      };

      // Preserve file-level properties if they exist
      if (config !== undefined) {
        result.config = config as Record<string, unknown>;
      }
      if (metadata !== undefined) {
        result.metadata = metadata as Record<string, unknown>;
      }
      if (tags !== undefined) {
        result.tags = tags as string[];
      }

      return result;
    }

    // Create a default suite with the tasks
    // Transform each task through the task schema (converts functions to {fn} format)
    const transformedBenchmarks: Record<string, BenchmarkTask> = {};
    for (const [taskName, taskValue] of Object.entries(tasks)) {
      const taskResult = benchmarkTaskSchema.safeParse(taskValue);
      if (taskResult.success) {
        transformedBenchmarks[taskName] = taskResult.data;
      } else {
        // Keep the original value; superRefine will catch and report the error
        transformedBenchmarks[taskName] = taskValue as BenchmarkTask;
      }
    }

    const defaultSuite: BenchmarkSuite = {
      benchmarks: transformedBenchmarks,
    };

    // Return in traditional format
    const result: BenchmarkDefinition = {
      suites: {
        default: defaultSuite,
      },
    };

    // Preserve file-level properties if they exist
    if (config !== undefined) {
      result.config = config as Record<string, unknown>;
    }
    if (metadata !== undefined) {
      result.metadata = metadata as Record<string, unknown>;
    }
    if (tags !== undefined) {
      result.tags = tags as string[];
    }

    return result;
  })
  .superRefine((value, ctx) => {
    // Validate that at least one suite exists
    if (!value.suites || Object.keys(value.suites).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one suite is required',
        path: ['suites'],
      });
      return;
    }

    // Validate each suite's benchmarks
    for (const [suiteName, suite] of Object.entries(value.suites)) {
      if (!suite.benchmarks || Object.keys(suite.benchmarks).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one benchmark is required in each suite',
          path: ['suites', suiteName, 'benchmarks'],
        });
        continue;
      }

      // Validate each benchmark task
      for (const [taskName, task] of Object.entries(suite.benchmarks)) {
        const taskValidation = benchmarkTaskSchema.safeParse(task);
        if (!taskValidation.success) {
          for (const issue of taskValidation.error.issues) {
            ctx.addIssue({
              ...issue,
              path: [
                'suites',
                suiteName,
                'benchmarks',
                taskName,
                ...issue.path,
              ],
            });
          }
        }
      }
    }
  })
  .describe(
    'A benchmark file containing one or more suites with configuration and metadata',
  ) as z.ZodType<BenchmarkDefinition>;
