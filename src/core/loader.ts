/**
 * ModestBench File Loader
 *
 * Handles discovery, loading, and validation of benchmark files.
 * Supports glob pattern matching and file structure validation.
 */

import { glob } from 'glob';
import { readFile, access } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types/index.js';
import type { FileLoader } from './engine.js';

/**
 * File change notification for watch functionality
 */
export interface FileChange {
  readonly type: 'added' | 'modified' | 'deleted';
  readonly filePath: string;
  readonly timestamp: Date;
}

/**
 * File watcher interface
 */
export interface FileWatcher {
  close(): void;
}

/**
 * Benchmark file structure after parsing
 */
export interface BenchmarkFile {
  readonly filePath: string;
  readonly content: string;
  readonly exports: unknown;
  readonly metadata: FileMetadata;
}

/**
 * File metadata for change detection and validation
 */
export interface FileMetadata {
  readonly size: number;
  readonly mtime: Date;
  readonly isValid: boolean;
  readonly hasDefaultExport: boolean;
  readonly hasBenchmarks: boolean;
  readonly exportNames: string[];
}

/**
 * Implementation of FileLoader for benchmark files
 */
export class BenchmarkFileLoader implements FileLoader {
  private readonly supportedExtensions = new Set([
    '.js',
    '.ts',
    '.mjs',
    '.cjs',
  ]);

  /**
   * Discover benchmark files using glob patterns
   */
  async discover(pattern: string, exclude: string[] = []): Promise<string[]> {
    try {
      const files = await glob(pattern, {
        ignore: exclude,
        absolute: true,
        nodir: true,
      });

      // Filter to supported file extensions
      const supportedFiles = files.filter((file: string) => {
        const ext = extname(file);
        return this.supportedExtensions.has(ext);
      });

      return supportedFiles.sort();
    } catch (error) {
      throw new Error(
        `File discovery failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load and parse a single benchmark file
   */
  async load(filePath: string): Promise<BenchmarkFile> {
    try {
      // Check file existence
      await access(filePath);

      // Read file content
      const content = await readFile(filePath, 'utf-8');

      // Get file metadata
      const metadata = await this.getFileMetadata(filePath, content);

      // Load the module (for now, just return the structure)
      // TODO: Implement actual module loading with dynamic import
      const exports = {}; // Placeholder

      return {
        filePath: resolve(filePath),
        content,
        exports,
        metadata,
      };
    } catch (error) {
      throw new Error(
        `Failed to load file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load multiple files in parallel
   */
  async loadAll(filePaths: string[]): Promise<BenchmarkFile[]> {
    try {
      const loadPromises = filePaths.map(filePath => this.load(filePath));
      return await Promise.all(loadPromises);
    } catch (error) {
      throw new Error(
        `Failed to load files: ${error instanceof Error ? error.message : String(error)}`
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
          file: filePath,
          message: 'File does not exist',
          code: 'FILE_NOT_FOUND',
          severity: 'error',
        });
        return { valid: false, errors, warnings, files: [] };
      }

      // Check file extension
      const ext = extname(filePath);
      if (!this.supportedExtensions.has(ext)) {
        errors.push({
          file: filePath,
          message: `Unsupported file extension: ${ext}. Supported extensions: ${Array.from(this.supportedExtensions).join(', ')}`,
          code: 'UNSUPPORTED_EXTENSION',
          severity: 'error',
        });
      }

      // Read and validate content
      let content: string;
      try {
        content = await readFile(filePath, 'utf-8');
      } catch (error) {
        errors.push({
          file: filePath,
          message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
          code: 'FILE_READ_ERROR',
          severity: 'error',
        });
        return { valid: false, errors, warnings, files: [filePath] };
      }

      // Basic syntax validation
      await this.validateSyntax(filePath, content, errors, warnings);

      // Structure validation
      await this.validateStructure(filePath, content, errors, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        files: [filePath],
      };
    } catch (error) {
      errors.push({
        file: filePath,
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR',
        severity: 'error',
      });

      return {
        valid: false,
        errors,
        warnings,
        files: [filePath],
      };
    }
  }

  /**
   * Watch for file changes (placeholder implementation)
   */
  watch(
    pattern: string,
    callback: (changes: FileChange[]) => void
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
    content: string
  ): Promise<FileMetadata> {
    const { stat } = await import('node:fs/promises');
    const stats = await stat(filePath);

    // Basic analysis of file content
    const hasDefaultExport = /export\s+default/.test(content);
    const exportMatches =
      content.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g) || [];
    const exportNames = exportMatches
      .map(match => {
        const nameMatch = match.match(
          /export\s+(?:const|let|var|function|class)\s+(\w+)/
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
      size: stats.size,
      mtime: stats.mtime,
      isValid: true, // Will be set based on validation
      hasDefaultExport,
      hasBenchmarks,
      exportNames,
    };
  }

  /**
   * Validate JavaScript/TypeScript syntax
   */
  private async validateSyntax(
    filePath: string,
    content: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Basic syntax checks
    if (content.trim().length === 0) {
      warnings.push({
        file: filePath,
        message: 'File is empty',
        code: 'EMPTY_FILE',
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
          file: filePath,
          message: `Mismatched braces: ${openBraces} open, ${closeBraces} close`,
          code: 'SYNTAX_ERROR',
          severity: 'error',
        });
      }

      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;

      if (openParens !== closeParens) {
        errors.push({
          file: filePath,
          message: `Mismatched parentheses: ${openParens} open, ${closeParens} close`,
          code: 'SYNTAX_ERROR',
          severity: 'error',
        });
      }
    } catch (error) {
      errors.push({
        file: filePath,
        message: `Syntax validation failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'SYNTAX_VALIDATION_ERROR',
        severity: 'error',
      });
    }
  }

  /**
   * Validate benchmark file structure and patterns
   */
  private async validateStructure(
    filePath: string,
    content: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for benchmark patterns
    const hasBenchmarkPatterns =
      /(?:suite|bench|test|it)\s*\(/.test(content) ||
      /\.add\s*\(/.test(content) ||
      /benchmark\s*\(/.test(content);

    if (!hasBenchmarkPatterns) {
      warnings.push({
        file: filePath,
        message:
          'No benchmark patterns found. Expected suite(), bench(), test(), it(), .add(), or benchmark() calls',
        code: 'NO_BENCHMARKS',
        severity: 'warning',
      });
    }

    // Check for anti-patterns
    if (/console\.time\(/.test(content)) {
      warnings.push({
        file: filePath,
        message:
          'Found console.time() usage. Consider using proper benchmark framework instead',
        code: 'CONSOLE_TIMING',
        severity: 'warning',
      });
    }

    if (
      /Date\.now\(\)/.test(content) &&
      /Date\.now\(\).*-.*Date\.now\(\)/.test(content)
    ) {
      warnings.push({
        file: filePath,
        message:
          'Found manual timing with Date.now(). Consider using proper benchmark framework instead',
        code: 'MANUAL_TIMING',
        severity: 'warning',
      });
    }

    // Check for async patterns without proper handling
    if (/async\s+function/.test(content) && !/await/.test(content)) {
      warnings.push({
        file: filePath,
        message:
          'Found async function without await. Make sure async benchmarks are properly handled',
        code: 'ASYNC_WITHOUT_AWAIT',
        severity: 'warning',
      });
    }
  }
}
