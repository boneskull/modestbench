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
  readonly hasBenchmarks: boolean;
  readonly hasDefaultExport: boolean;
  readonly isValid: boolean;
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
 * Zod schema for validating benchmark task structure
 */
const benchmarkTaskSchema = z.object({
  fn: z.function(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Zod schema for validating benchmark suite structure
 */
const benchmarkSuiteSchema = z.object({
  benchmarks: z.record(z.string(), benchmarkTaskSchema),
  config: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  setup: z.function().optional(),
  tags: z.array(z.string()).optional(),
  teardown: z.function().optional(),
});

/**
 * Zod schema for validating benchmark file structure
 */
const benchmarkFileSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  suites: z
    .record(z.string(), benchmarkSuiteSchema)
    .refine((suites) => Object.keys(suites).length > 0, {
      message: 'At least one suite is required',
    }),
  tags: z.array(z.string()).optional(),
});

/**
 * Implementation of FileLoader for benchmark files
 */
export class BenchmarkFileLoader implements FileLoader {
  private readonly supportedExtensions = new Set([
    '.cjs',
    '.js',
    '.mjs',
    '.ts',
  ]);

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
      if (!structureValidation.valid) {
        throw new Error(
          `Invalid benchmark structure: ${structureValidation.errors.map((e) => e.message).join(', ')}`,
        );
      }

      // Analyze exports for metadata (simplified - structure already validated)
      const hasDefaultExport = module.default !== undefined;
      const exportNames = Object.keys(module);
      const hasBenchmarks = true; // Already validated by Zod schema

      return {
        content,
        exports,
        filePath,
        metadata: {
          exportNames,
          hasBenchmarks,
          hasDefaultExport,
          isValid: true,
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
   * Validate the structure of loaded exports using Zod schema
   */
  private validateExports(
    filePath: string,
    exports: unknown,
  ): {
    valid: boolean;
    errors: ValidationError[];
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
      }

      return { valid: result.success, errors, warnings };
    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        file: filePath,
        message: `Structure validation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
      return { valid: false, errors, warnings };
    }
  }
}
