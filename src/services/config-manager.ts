/**
 * ModestBench Configuration Manager
 *
 * Handles loading, merging, and validation of configuration from multiple
 * sources. Supports CLI arguments, config files (JSON/YAML/JS/TS), and
 * defaults.
 */

import { cosmiconfig } from 'cosmiconfig';
import { resolve } from 'node:path';

import type { ModestBenchError } from '../errors/base.js';
import type {
  ConfigurationManager,
  ModestBenchConfig,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/index.js';

import { safeParseConfig } from '../config/schema.js';
import { ErrorCodes } from '../constants.js';
import { ConfigLoadError, ConfigValidationError } from '../errors/index.js';

/**
 * Get the default reporter based on TTY status and environment
 */
const getDefaultReporter = (): string => {
  // Use simple reporter when stdout is not a TTY and color is not forced
  if (!process.stdout.isTTY && !isColorForced()) {
    return 'simple';
  }
  return 'human';
};

/**
 * Check if color output has been forced via environment variables
 */
const isColorForced = (): boolean => {
  return (
    process.env.FORCE_COLOR !== undefined &&
    process.env.FORCE_COLOR !== '0' &&
    process.env.NO_COLOR === undefined
  );
};

/**
 * Default configuration values Using minimal values to reduce test overhead
 * while maintaining functionality
 */
const DEFAULT_CONFIG: ModestBenchConfig = {
  bail: false,
  exclude: ['node_modules/**', '.git/**'],
  excludeTags: [],
  iterations: 100, // Sufficient iterations for reliable statistics
  limitBy: 'iterations', // Default to limiting by iteration count
  metadata: {},
  outputDir: '.modestbench',
  pattern: 'bench/**/*.bench.{js,ts,mjs,cjs,mts,cts}', // Search bench/ directory recursively
  quiet: false,
  reporterConfig: {},
  reporters: [getDefaultReporter()],
  tags: [],
  thresholds: {},
  time: 1000, // 1 second minimum for tinybench to gather samples
  timeout: 30000, // 30 seconds
  verbose: false, // No verbose output by default
  warmup: 30, // Light warmup by default - enough for basic JIT optimization
};

/**
 * Configuration precedence order (highest to lowest):
 *
 * 1. CLI arguments
 * 2. Config file
 * 3. Default values
 */
export class ModestBenchConfigurationManager implements ConfigurationManager {
  /**
   * Apply smart defaults for limitBy based on which flags were provided
   */
  public static applySmartDefaults(
    merged: ModestBenchConfig,
    cliArgs: Record<string, unknown>,
    fileConfig: Partial<ModestBenchConfig>,
  ): ModestBenchConfig {
    // If limitBy was explicitly provided in CLI or file, use it
    if (cliArgs['limit-by'] || cliArgs.limitBy || fileConfig.limitBy) {
      return merged;
    }

    // Determine if user explicitly provided time or iterations
    const userProvidedTime = 'time' in cliArgs || 't' in cliArgs;
    const userProvidedIterations = 'iterations' in cliArgs || 'i' in cliArgs;

    let smartDefault: 'any' | 'iterations' | 'time';

    if (userProvidedTime && userProvidedIterations) {
      // Both provided → stop at whichever comes first
      smartDefault = 'any';
    } else if (userProvidedTime) {
      // Only time → limit by time
      smartDefault = 'time';
    } else {
      // Only iterations (or neither) → limit by iterations
      smartDefault = 'iterations';
    }

    return {
      ...merged,
      limitBy: smartDefault,
    };
  }

  /**
   * Get default configuration values
   */
  getDefaults(): ModestBenchConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Load configuration from various sources with precedence
   *
   * @param configPath - Optional path to configuration file
   * @param cliArgs - Optional CLI arguments to merge
   * @param commandDefaults - Command-specific defaults (fallback to
   *   DEFAULT_CONFIG)
   */
  async load(
    configPath?: string,
    cliArgs?: Record<string, unknown>,
    commandDefaults?: Partial<ModestBenchConfig>,
  ): Promise<ModestBenchConfig> {
    try {
      // Create a fresh explorer for each load to avoid module caching issues
      const explorer = this.createExplorer();

      // 1. Load config file using cosmiconfig
      let result;
      if (configPath) {
        const resolvedPath = resolve(configPath);
        // For .js/.mjs/.cjs files, add cache busting to the import to avoid Node's module cache
        if (
          resolvedPath.endsWith('.js') ||
          resolvedPath.endsWith('.mjs') ||
          resolvedPath.endsWith('.cjs')
        ) {
          // Clear Node's module cache for this file to ensure fresh load
          const moduleUrl = `${resolvedPath}?t=${Date.now()}`;
          try {
            const module = (await import(moduleUrl)) as {
              [key: string]: unknown;
              default?: unknown;
            };
            result = {
              config: module.default || module,
              filepath: resolvedPath,
            };
          } catch {
            // Fall back to explorer.load if cache busting fails
            result = await explorer.load(resolvedPath);
          }
        } else {
          result = await explorer.load(resolvedPath);
        }
      } else {
        result = await explorer.search();
      }

      const fileConfig = (result?.config || {}) as Partial<ModestBenchConfig>;

      // 2. Merge: command defaults <- file <- CLI args
      // Use command-specific defaults if provided, otherwise use DEFAULT_CONFIG
      const baseDefaults = commandDefaults
        ? this.merge(DEFAULT_CONFIG, commandDefaults)
        : DEFAULT_CONFIG;
      const normalizedCliArgs = cliArgs ? this.normalizeCliArgs(cliArgs) : {};
      const merged = this.merge(baseDefaults, fileConfig, normalizedCliArgs);

      // 2.5. Apply smart defaults for limitBy if not explicitly provided
      const finalConfig = ModestBenchConfigurationManager.applySmartDefaults(
        merged,
        cliArgs || {},
        fileConfig,
      );

      // 3. Validate final configuration and get transformed config
      // The validation also transforms budgets from nested to flat format
      const validation = safeParseConfig(finalConfig);
      if (!validation.success) {
        const errors = validation.error.issues.map((issue) => {
          const path = issue.path.join('.');
          return `${path ? `${path}: ` : ''}${issue.message}`;
        });
        throw new ConfigValidationError(
          `Configuration validation failed: ${errors.join(', ')}`,
        );
      }

      return validation.data;
    } catch (error) {
      // Re-throw our custom errors
      if (
        (error as ModestBenchError).code === ErrorCodes.CONFIG_VALIDATION_FAILED
      ) {
        throw error;
      }
      throw new ConfigLoadError(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Merge multiple configuration objects with precedence
   */
  merge(...configs: Partial<ModestBenchConfig>[]): ModestBenchConfig {
    let result: Partial<ModestBenchConfig> = {};

    for (const config of configs) {
      result = {
        ...result,
        ...config,
        // Special handling for arrays - replace rather than merge
        // Allow empty arrays to override defaults (for pattern defaulting in loader)
        ...(config.pattern !== undefined && {
          pattern: Array.isArray(config.pattern)
            ? [...config.pattern]
            : config.pattern,
        }),
        ...(config.exclude && { exclude: [...config.exclude] }),
        ...(config.excludeTags && { excludeTags: [...config.excludeTags] }),
        ...(config.reporters && { reporters: [...config.reporters] }),
        ...(config.tags && { tags: [...config.tags] }),
        // Deep merge for objects
        ...(config.reporterConfig && {
          reporterConfig: {
            ...result.reporterConfig,
            ...config.reporterConfig,
          },
        }),
        ...(config.metadata && {
          metadata: { ...result.metadata, ...config.metadata },
        }),
        ...(config.thresholds && {
          thresholds: { ...result.thresholds, ...config.thresholds },
        }),
      };
    }

    return { ...DEFAULT_CONFIG, ...result };
  }

  /**
   * Validate configuration object using Zod schema
   */
  validate(config: ModestBenchConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Use Zod schema validation
    const result = safeParseConfig(config);

    if (!result.success) {
      // Convert Zod errors to ValidationError format
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        errors.push({
          code: `INVALID_${path.toUpperCase().replace(/\./g, '_') || 'CONFIG'}`,
          file: 'configuration',
          message: `${path ? `${path}: ` : ''}${issue.message}`,
          severity: 'error',
        });
      }
    }

    // Additional logical validations and warnings
    if (result.success) {
      const validConfig = result.data;

      // Warn about empty reporters
      if (validConfig.reporters.length === 0) {
        warnings.push({
          code: 'NO_REPORTERS',
          file: 'configuration',
          message: 'no reporters specified, using default human reporter',
          severity: 'warning',
        });
      }

      // Warn about potentially long runtime
      if (validConfig.iterations > 1000 && validConfig.time > 60000) {
        warnings.push({
          code: 'LONG_RUNTIME_WARNING',
          file: 'configuration',
          message:
            'high iterations and time values may result in very long benchmark runs',
          severity: 'warning',
        });
      }
    }

    return {
      errors,
      files: ['configuration'],
      valid: errors.length === 0,
      warnings,
    };
  }

  /**
   * Create a cosmiconfig explorer for loading configuration files
   */
  private createExplorer() {
    return cosmiconfig('modestbench', {
      cache: false, // Disable caching to prevent cross-contamination between different config files
      loaders: {
        '.ts': async (filepath: string): Promise<unknown> => {
          // Use cosmiconfig-typescript-loader to load TypeScript files
          // This works without tsx in the import chain
          const { TypeScriptLoader: createTypeScriptLoader } = await import(
            'cosmiconfig-typescript-loader'
          );
          const loader = createTypeScriptLoader();
          const { readFile } = await import('node:fs/promises');
          const content = await readFile(filepath, 'utf-8');
          return (await loader(filepath, content)) as unknown;
        },
      },
      searchPlaces: [
        'package.json',
        '.modestbenchrc',
        '.modestbenchrc.json',
        '.modestbenchrc.yaml',
        '.modestbenchrc.yml',
        '.modestbenchrc.js',
        '.modestbenchrc.mjs',
        '.modestbenchrc.cjs',
        'modestbench.config.json',
        'modestbench.config.yaml',
        'modestbench.config.yml',
        'modestbench.config.js',
        'modestbench.config.mjs',
        'modestbench.config.cjs',
        'modestbench.config.ts',
      ],
    });
  }

  /**
   * Normalize CLI arguments to configuration format
   */
  private normalizeCliArgs(
    cliArgs: Record<string, unknown>,
  ): Partial<ModestBenchConfig> {
    const normalized: Record<string, unknown> = {};

    // Map CLI argument names to config property names
    const argMap: Record<string, keyof ModestBenchConfig> = {
      bail: 'bail',
      exclude: 'exclude',
      'exclude-tags': 'excludeTags',
      excludeTags: 'excludeTags',
      i: 'iterations',
      iterations: 'iterations',
      'limit-by': 'limitBy',
      limitBy: 'limitBy',
      o: 'outputDir',
      output: 'outputDir',
      'output-dir': 'outputDir',
      pattern: 'pattern',
      q: 'quiet',
      quiet: 'quiet',
      r: 'reporters',
      reporters: 'reporters',
      t: 'time',
      tags: 'tags',
      time: 'time',
      timeout: 'timeout',
      v: 'verbose',
      verbose: 'verbose',
      w: 'warmup',
      warmup: 'warmup',
    };

    for (const [cliKey, configKey] of Object.entries(argMap)) {
      if (cliKey in cliArgs && cliArgs[cliKey] !== undefined) {
        const value = cliArgs[cliKey];

        // Handle array arguments that might come as strings
        if (
          configKey === 'exclude' ||
          configKey === 'excludeTags' ||
          configKey === 'reporters' ||
          configKey === 'tags'
        ) {
          if (typeof value === 'string') {
            normalized[configKey] = value.split(',').map((s) => s.trim());
          } else if (Array.isArray(value)) {
            normalized[configKey] = value;
          }
        } else {
          normalized[configKey] = value;
        }
      }
    }

    return normalized as Partial<ModestBenchConfig>;
  }
}
