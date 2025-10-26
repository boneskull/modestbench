/**
 * ModestBench File Loader
 *
 * Handles discovery, loading, and validation of benchmark files. Supports glob
 * pattern matching and file structure validation.
 */

import { glob } from 'glob';
import { access, readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';

import type {
  BenchmarkDefinition,
  BenchmarkFile,
  FileLoader,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/index.js';

import {
  BENCHMARK_FILE_EXTENSIONS,
  BENCHMARK_FILE_PATTERN,
} from '../constants.js';
import { benchmarkFileSchema } from '../core/benchmark-schema.js';
import {
  FileDiscoveryError,
  FileLoadError,
  StructureValidationError,
} from '../errors/index.js';

/**
 * File change notification for watch functionality
 */
interface FileChange {
  readonly filePath: string;
  readonly timestamp: Date;
  readonly type: 'added' | 'deleted' | 'modified';
}

/**
 * File watcher interface
 */
interface FileWatcher {
  close(): void;
}

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
      let patterns = Array.isArray(pattern) ? pattern : [pattern];

      // Handle empty patterns - use sensible defaults
      if (patterns.length === 0) {
        patterns = [
          `*${BENCHMARK_FILE_PATTERN}`, // top-level current directory
          `bench/*${BENCHMARK_FILE_PATTERN}`, // top-level bench/ directory
        ];
      }

      // Expand directory paths to recursive glob patterns
      const expandedPatterns: string[] = [];
      for (const p of patterns) {
        try {
          const stats = await stat(p);
          if (stats.isDirectory()) {
            // Directory: search recursively
            expandedPatterns.push(`${p}/**/*${BENCHMARK_FILE_PATTERN}`);
          } else {
            // File or doesn't exist: use as-is (glob will handle it)
            expandedPatterns.push(p);
          }
        } catch {
          // Path doesn't exist, treat as glob pattern
          expandedPatterns.push(p);
        }
      }

      const allFiles = new Set<string>();

      // Process each pattern
      for (const p of expandedPatterns) {
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
      throw new FileDiscoveryError(
        `File discovery failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
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
        throw new FileLoadError(
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

      if (ext === '.ts' || ext === '.mts' || ext === '.cts') {
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
        throw new StructureValidationError(
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
      // Re-throw our custom errors
      if (
        error instanceof FileLoadError ||
        error instanceof StructureValidationError
      ) {
        throw error;
      }
      throw new FileLoadError(
        `Failed to load file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
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
      // Re-throw our custom errors (from individual load calls)
      if (
        error instanceof FileLoadError ||
        error instanceof StructureValidationError
      ) {
        throw error;
      }
      throw new FileLoadError(
        `Failed to load files: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
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
