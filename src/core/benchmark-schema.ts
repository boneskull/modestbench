/**
 * ModestBench Benchmark File Schema
 *
 * Zod schemas for validating and parsing benchmark file structure. Supports
 * both traditional suite-based format and simplified flat task definitions.
 *
 * Types are derived from schemas using z.infer (output) and z.input (input).
 */

import { z } from 'zod';

import type { ModestBenchConfig } from '../types/core.js';

import { partialModestBenchConfigSchema } from '../config/schema.js';

/**
 * Schema for benchmark functions
 */
const benchmarkFnSchema = z.custom<(...args: any[]) => unknown>(
  (value) => typeof value === 'function',
  { message: 'Expected a function' },
);

/**
 * Zod schema for the full benchmark task object structure (normalized output)
 */
const benchmarkTaskObjectSchema = z.object({
  config: partialModestBenchConfigSchema
    .optional()
    .describe('Task-specific configuration overrides'),
  fn: benchmarkFnSchema.describe('The function to benchmark'),
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
 *
 * Input: function OR object Output: always normalized to object with fn
 * property
 */
const benchmarkTaskSchema = z
  .union([
    benchmarkTaskObjectSchema,
    benchmarkFnSchema.transform((fn) => ({ fn })),
  ])
  .pipe(benchmarkTaskObjectSchema)
  .describe('A single benchmark task definition (object or function)');

/**
 * Zod schema for validating benchmark suite structure
 */
const benchmarkSuiteSchema = z
  .object({
    benchmarks: z
      .record(z.string(), benchmarkTaskSchema)
      .describe('Map of benchmark task names to task definitions'),
    config: partialModestBenchConfigSchema
      .optional()
      .describe('Suite-specific configuration overrides'),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Custom metadata associated with the suite'),
    setup: benchmarkFnSchema
      .optional()
      .describe('Function to run before all benchmarks in the suite'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Tags for filtering and grouping suites'),
    teardown: benchmarkFnSchema
      .optional()
      .describe('Function to run after all benchmarks in the suite'),
  })
  .describe('A benchmark suite containing multiple tasks');

/**
 * Zod schema for validating benchmark file structure.
 *
 * Supports two formats:
 *
 * 1. Suite format (supports config/metadata/tags): { suites: { 'Suite Name': {
 *    benchmarks: {...} } }, config: {...} }
 * 2. Flat format (simple, tasks only - no config/metadata/tags): { 'task name': ()
 *    => {...} }
 *
 * The flat format is automatically transformed to suite format with a default
 * suite.
 *
 * Input: flat Record<string, function> OR suite object Output: always
 * normalized to suite format
 */
export const benchmarkFileSchema = z
  .union([
    // Suite format: explicit structure with config/metadata/tags support
    z.object({
      config: partialModestBenchConfigSchema
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
    // Flat format: simple tasks only (no config/metadata/tags)
    z
      .record(z.string(), benchmarkFnSchema)
      .refine((tasks) => Object.keys(tasks).length > 0, {
        message: 'At least one task is required',
      })
      .transform((tasks) => ({
        // Ensure all optional properties exist (as undefined) for type consistency
        config: undefined as Partial<ModestBenchConfig> | undefined,
        metadata: undefined as Record<string, unknown> | undefined,
        suites: {
          default: {
            benchmarks: Object.fromEntries(
              Object.entries(tasks).map(([name, fn]) => [name, { fn }]),
            ),
          },
        },
        tags: undefined as string[] | undefined,
      })),
  ])
  .describe(
    'A benchmark file containing one or more suites with configuration and metadata',
  );

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Benchmark file definition (normalized) - internal representation Always in
 * suite format
 */
export type BenchmarkDefinition = z.infer<typeof benchmarkFileSchema>;

/**
 * Benchmark file definition (input) - what users write Can be either flat
 * format (Record<string, function>) or suite format
 */
export type BenchmarkDefinitionInput = z.input<typeof benchmarkFileSchema>;

/**
 * Benchmark suite (normalized) - internal representation
 */
export type BenchmarkSuite = z.infer<typeof benchmarkSuiteSchema>;

/**
 * Benchmark suite (input) - what users write
 */
export type BenchmarkSuiteInput = z.input<typeof benchmarkSuiteSchema>;

/**
 * Benchmark task (normalized) - internal representation Always an object with
 * fn property
 */
export type BenchmarkTask = z.infer<typeof benchmarkTaskSchema>;

/**
 * Benchmark task (input) - what users write Can be either a function or an
 * object with fn property
 */
export type BenchmarkTaskInput = z.input<typeof benchmarkTaskSchema>;
