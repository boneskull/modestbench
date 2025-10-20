/**
 * ModestBench File Loader
 *
 * Handles discovery, loading, and validation of benchmark files. Supports glob
 * pattern matching and file structure validation.
 */

import { glob } from 'glob';
import { access, readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { z } from 'zod';

import type {
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/index.js';
import type { FileLoader } from './engine.js';

import { BENCHMARK_FILE_EXTENSIONS } from '../constants.js';

/**
 * A benchmark file containing one or more suites with configuration and
 * metadata
 */
export interface BenchmarkDefinition {
  /** File-level configuration overrides */
  config?: Record<string, unknown>;
  /** Custom metadata associated with the file */
  metadata?: Record<string, unknown>;
  /** Map of suite names to suite definitions */
  suites: Record<string, BenchmarkSuite>;
  /** Tags for filtering and grouping files */
  tags?: string[];
}

/**
 * Benchmark file structure after parsing
 */
export interface BenchmarkFile {
  readonly content: string;
  readonly exports: unknown;
  readonly filePath: string;
  readonly metadata: FileMetadata;
}

/**
 * A benchmark suite containing multiple tasks
 */
export interface BenchmarkSuite {
  /** Map of benchmark task names to task definitions */
  benchmarks: Record<string, BenchmarkTask>;
  /** Suite-specific configuration overrides */
  config?: Record<string, unknown>;
  /** Custom metadata associated with the suite */
  metadata?: Record<string, unknown>;
  /** Function to run before all benchmarks in the suite */
  setup?: (...args: any[]) => any;
  /** Tags for filtering and grouping suites */
  tags?: string[];
  /** Function to run after all benchmarks in the suite */
  teardown?: (...args: any[]) => any;
}

/**
 * A single benchmark task definition
 */
export interface BenchmarkTask {
  /** Task-specific configuration overrides */
  config?: Record<string, unknown>;
  /** The function to benchmark */
  fn: (...args: any[]) => any;
  /** Custom metadata associated with the task */
  metadata?: Record<string, unknown>;
  /** Tags for filtering and grouping tasks */
  tags?: string[];
}

/**
 * File change notification for watch functionality
 */
interface FileChange {
  readonly filePath: string;
  readonly timestamp: Date;
  readonly type: 'added' | 'deleted' | 'modified';
}

/**
 * File metadata for change detection and validation
 */
interface FileMetadata {
  readonly exportNames: string[];
  readonly hasDefaultExport: boolean;
  readonly mtime: Date;
  readonly size: number;
}

/**
 * File watcher interface
 */
interface FileWatcher {
  close(): void;
}

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
 * Zod schema for validating benchmark file structure
 */
const benchmarkFileSchema: z.ZodType<BenchmarkDefinition> = z
  .object({
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
        error: 'At least one suite is required',
      })
      .describe('Map of suite names to suite definitions'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Tags for filtering and grouping files'),
  })
  .describe(
    'A benchmark file containing one or more suites with configuration and metadata',
  );

/**
 * Implementation of FileLoader for benchmark files
 */
export class BenchmarkFileLoader implements FileLoader {
  private readonly supportedExtensions = BENCHMARK_FILE_EXTENSIONS;

  /**
   * Discover benchmark files using glob patterns or explicit file paths
   */
  async discover(
    pattern: string | string[],
    exclude: string[] = [],
  ): Promise<string[]> {
    try {
      const patterns = Array.isArray(pattern) ? pattern : [pattern];
      const allFiles = new Set<string>();

      // Process each pattern
      for (const p of patterns) {
        const files = await glob(p, {
          absolute: true,
          ignore: exclude,
          nodir: true,
        });

        // Add discovered files to the set (automatic deduplication)
        for (const file of files) {
          allFiles.add(file);
        }
      }

      // Filter to supported file extensions
      const supportedFiles = Array.from(allFiles).filter((file: string) => {
        const ext = extname(file);
        return this.supportedExtensions.has(ext);
      });

      return supportedFiles.sort();
    } catch (error) {
      throw new Error(
        `File discovery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load a single benchmark file
   */
  async load(filePath: string): Promise<BenchmarkFile> {
    try {
      // Basic file checks (existence, extension)
      const basicValidation = await this.validate(filePath);
      if (!basicValidation.valid) {
        throw new Error(
          `Invalid benchmark file: ${basicValidation.errors.map((e) => e.message).join(', ')}`,
        );
      }

      // Read file content
      const content = await readFile(filePath, 'utf-8');

      // Get file stats for metadata
      const stats = await stat(filePath);

      // Load the module using dynamic import
      const ext = extname(filePath);
      let module: { [key: string]: unknown; default?: unknown };

      if (ext === '.ts') {
        // For TypeScript files, use cosmiconfig-typescript-loader
        const { TypeScriptLoader: createTypeScriptLoader } = await import(
          'cosmiconfig-typescript-loader'
        );
        const loader = createTypeScriptLoader();
        module = (await loader(filePath, content)) as {
          [key: string]: unknown;
          default?: unknown;
        };
      } else {
        // Use native dynamic import for JavaScript files with cache busting
        // Add timestamp to prevent module caching issues across multiple loads
        const timestamp = Date.now();
        module = (await import(`${filePath}?t=${timestamp}`)) as {
          [key: string]: unknown;
          default?: unknown;
        };
      }

      const exports = module.default || module;

      // Validate the loaded exports structure with Zod
      const structureValidation = this.validateExports(filePath, exports);
      if (!structureValidation.valid || !structureValidation.data) {
        throw new Error(
          `Invalid benchmark structure: ${structureValidation.errors.map((e) => e.message).join(', ')}`,
        );
      }

      // Use the transformed/normalized data from Zod
      // (this ensures shorthand functions are properly wrapped)
      const normalizedExports = structureValidation.data;

      // Analyze exports for metadata (simplified - structure already validated)
      const hasDefaultExport = module.default !== undefined;
      const exportNames = Object.keys(module);

      return {
        content,
        exports: normalizedExports,
        filePath,
        metadata: {
          exportNames,
          hasDefaultExport,
          mtime: stats.mtime,
          size: stats.size,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to load file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load multiple files in parallel
   */
  async loadAll(filePaths: string[]): Promise<BenchmarkFile[]> {
    try {
      const loadPromises = filePaths.map((filePath) => this.load(filePath));
      return await Promise.all(loadPromises);
    } catch (error) {
      throw new Error(
        `Failed to load files: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate benchmark file (basic checks only - file existence and extension)
   * Structure validation happens after loading in the load() method
   */
  async validate(filePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Check file existence
      try {
        await access(filePath);
      } catch {
        errors.push({
          code: 'FILE_NOT_FOUND',
          file: filePath,
          message: 'File does not exist',
          severity: 'error',
        });
        return { errors, files: [], valid: false, warnings };
      }

      // Check file extension
      const ext = extname(filePath);
      if (!this.supportedExtensions.has(ext)) {
        errors.push({
          code: 'UNSUPPORTED_EXTENSION',
          file: filePath,
          message: `Unsupported file extension: ${ext}. Supported extensions: ${Array.from(this.supportedExtensions).join(', ')}`,
          severity: 'error',
        });
      }

      return {
        errors,
        files: [filePath],
        valid: errors.length === 0,
        warnings,
      };
    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        file: filePath,
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });

      return {
        errors,
        files: [filePath],
        valid: false,
        warnings,
      };
    }
  }

  /**
   * Watch for file changes (placeholder implementation)
   */
  watch(
    _pattern: string,
    _callback: (changes: FileChange[]) => void,
  ): FileWatcher {
    // TODO: Implement file watching with chokidar or similar
    // For now, return a no-op watcher
    return {
      close() {
        // No-op
      },
    };
  }

  /**
   * Validate the structure of loaded exports using Zod schema Returns the
   * transformed/normalized data if validation succeeds
   */
  private validateExports(
    filePath: string,
    exports: unknown,
  ): {
    data?: BenchmarkDefinition;
    errors: ValidationError[];
    valid: boolean;
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const result = benchmarkFileSchema.safeParse(exports);

      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
          errors.push({
            code: 'INVALID_STRUCTURE',
            file: filePath,
            message: `${path}${issue.message}`,
            severity: 'error',
          });
        }
        return { errors, valid: false, warnings };
      }

      // Return the transformed data (with shorthand functions normalized)
      return { data: result.data, errors, valid: true, warnings };
    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        file: filePath,
        message: `Structure validation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
      return { errors, valid: false, warnings };
    }
  }
}
