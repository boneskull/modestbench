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
      // Validate file first
      const validation = await this.validate(filePath);
      if (!validation.valid) {
        throw new Error(
          `Invalid benchmark file: ${validation.errors.map((e) => e.message).join(', ')}`,
        );
      }

      // Read file content
      const content = await readFile(filePath, 'utf-8');

      // Get file stats for metadata
      const stats = await stat(filePath);

      // Load the module using dynamic import
      // For TypeScript files, use tsx to transpile on-the-fly without type-checking
      const ext = extname(filePath);
      let module: { [key: string]: unknown; default?: unknown };

      if (ext === '.ts') {
        // Dynamically import tsx for TypeScript files
        // Note: tsx is loaded dynamically to avoid module resolution issues during CJS build
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { tsImport } = await import('tsx/dist/esm/api/index.mjs');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        module = (await tsImport(filePath, import.meta.url)) as {
          [key: string]: unknown;
          default?: unknown;
        };
      } else {
        // Use native dynamic import for JavaScript files
        module = (await import(filePath)) as {
          [key: string]: unknown;
          default?: unknown;
        };
      }

      const exports = module.default || module;

      // Analyze exports for metadata
      const hasDefaultExport = module.default !== undefined;
      const exportNames = Object.keys(module);
      const hasBenchmarks = Boolean(
        exports &&
          typeof exports === 'object' &&
          'suites' in exports &&
          exports.suites &&
          typeof exports.suites === 'object' &&
          Object.keys(exports.suites as Record<string, unknown>).length > 0,
      );

      return {
        content,
        exports,
        filePath,
        metadata: {
          exportNames,
          hasBenchmarks,
          hasDefaultExport,
          isValid: validation.valid,
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
   * Validate benchmark file structure
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

      // Read and validate content
      let content: string;
      try {
        content = await readFile(filePath, 'utf-8');
      } catch (error) {
        errors.push({
          code: 'FILE_READ_ERROR',
          file: filePath,
          message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
        });
        return { errors, files: [filePath], valid: false, warnings };
      }

      // Basic syntax validation
      await this.validateSyntax(filePath, content, errors, warnings);

      // Structure validation
      await this.validateStructure(filePath, content, errors, warnings);

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
   * Get file metadata for validation and change detection
   */
  private async getFileMetadata(
    filePath: string,
    content: string,
  ): Promise<FileMetadata> {
    const { stat } = await import('node:fs/promises');
    const stats = await stat(filePath);

    // Basic analysis of file content
    const hasDefaultExport = /export\s+default/.test(content);
    const exportMatches =
      content.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g) || [];
    const exportNames = exportMatches
      .map((match) => {
        const nameMatch = match.match(
          /export\s+(?:const|let|var|function|class)\s+(\w+)/,
        );
        return nameMatch?.[1];
      })
      .filter((name): name is string => Boolean(name));

    // Check for benchmark-like patterns
    const hasBenchmarks =
      /(?:suite|bench|test|it)\s*\(/.test(content) ||
      /\.add\s*\(/.test(content) ||
      /benchmark\s*\(/.test(content);

    return {
      exportNames,
      hasBenchmarks,
      hasDefaultExport,
      isValid: true, // Will be set based on validation
      mtime: stats.mtime,
      size: stats.size,
    };
  }

  /**
   * Validate benchmark file structure and patterns
   */
  private async validateStructure(
    filePath: string,
    content: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): Promise<void> {
    // Check for benchmark patterns
    const hasBenchmarkPatterns =
      /(?:suite|bench|test|it)\s*\(/.test(content) ||
      /\.add\s*\(/.test(content) ||
      /benchmark\s*\(/.test(content) ||
      // Check for declarative structure patterns
      /suites\s*:\s*\{/.test(content) ||
      /benchmarks\s*:\s*\{/.test(content) ||
      /export\s+default\s+\{[\s\S]*suites/.test(content);

    if (!hasBenchmarkPatterns) {
      warnings.push({
        code: 'NO_BENCHMARKS',
        file: filePath,
        message:
          'No benchmark patterns found. Expected suite(), bench(), test(), it(), .add(), benchmark() calls, or declarative structure with suites/benchmarks',
        severity: 'warning',
      });
    }

    // Check for anti-patterns
    if (/console\.time\(/.test(content)) {
      warnings.push({
        code: 'CONSOLE_TIMING',
        file: filePath,
        message:
          'Found console.time() usage. Consider using proper benchmark framework instead',
        severity: 'warning',
      });
    }

    if (
      /Date\.now\(\)/.test(content) &&
      /Date\.now\(\).*-.*Date\.now\(\)/.test(content)
    ) {
      warnings.push({
        code: 'MANUAL_TIMING',
        file: filePath,
        message:
          'Found manual timing with Date.now(). Consider using proper benchmark framework instead',
        severity: 'warning',
      });
    }

    // Check for async patterns without proper handling
    if (/async\s+function/.test(content) && !/await/.test(content)) {
      warnings.push({
        code: 'ASYNC_WITHOUT_AWAIT',
        file: filePath,
        message:
          'Found async function without await. Make sure async benchmarks are properly handled',
        severity: 'warning',
      });
    }
  }

  /**
   * Validate JavaScript/TypeScript syntax
   */
  private async validateSyntax(
    filePath: string,
    content: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): Promise<void> {
    // Basic syntax checks
    if (content.trim().length === 0) {
      warnings.push({
        code: 'EMPTY_FILE',
        file: filePath,
        message: 'File is empty',
        severity: 'warning',
      });
      return;
    }

    // Check for basic JavaScript/TypeScript syntax errors
    try {
      // Simple checks for common syntax issues
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;

      if (openBraces !== closeBraces) {
        errors.push({
          code: 'SYNTAX_ERROR',
          file: filePath,
          message: `Mismatched braces: ${openBraces} open, ${closeBraces} close`,
          severity: 'error',
        });
      }

      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;

      if (openParens !== closeParens) {
        errors.push({
          code: 'SYNTAX_ERROR',
          file: filePath,
          message: `Mismatched parentheses: ${openParens} open, ${closeParens} close`,
          severity: 'error',
        });
      }
    } catch (error) {
      errors.push({
        code: 'SYNTAX_VALIDATION_ERROR',
        file: filePath,
        message: `Syntax validation failed: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
    }
  }
}
