/**
 * ModestBench Configuration Manager
 *
 * Handles loading, merging, and validation of configuration from multiple
 * sources. Supports CLI arguments, config files (JSON/YAML/JS/TS), and
 * defaults.
 */

import { cosmiconfig } from 'cosmiconfig';
import { resolve } from 'node:path';

import type {
  ConfigurationManager,
  ModestBenchConfig,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/index.js';

import { safeParseConfig } from './schema.js';

/**
 * Default configuration values Using minimal values to reduce test overhead
 * while maintaining functionality
 */
const DEFAULT_CONFIG: ModestBenchConfig = {
  bail: false,
  exclude: ['node_modules/**', '.git/**'],
  iterations: 100, // Sufficient iterations for reliable statistics
  limitBy: 'iterations', // Default to limiting by iteration count
  metadata: {},
  outputDir: './benchmark-results',
  pattern: '**/*.bench.{js,ts,mjs,cjs,mts}',
  quiet: false,
  reporterConfig: {},
  reporters: ['human'],
  tags: [],
  thresholds: {},
  time: 1000, // 1 second minimum for tinybench to gather samples
  timeout: 30000, // 30 seconds
  verbose: false,
  warmup: 0, // No warmup by default for test speed
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
   * Get default configuration values
   */
  getDefaults(): ModestBenchConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Load configuration from various sources with precedence
   */
  async load(
    configPath?: string,
    cliArgs?: Record<string, unknown>,
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

      // 2. Merge: defaults <- file <- CLI args
      const normalizedCliArgs = cliArgs ? this.normalizeCliArgs(cliArgs) : {};
      const merged = this.merge(DEFAULT_CONFIG, fileConfig, normalizedCliArgs);

      // 2.5. Apply smart defaults for limitBy if not explicitly provided
      const finalConfig = this.applySmartDefaults(
        merged,
        cliArgs || {},
        fileConfig,
      );

      // 3. Validate final configuration
      const validation = this.validate(finalConfig);
      if (!validation.valid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
        );
      }

      return finalConfig;
    } catch (error) {
      throw new Error(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
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
        ...(config.exclude && { exclude: [...config.exclude] }),
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
   * Apply smart defaults for limitBy based on which flags were provided
   */
  private applySmartDefaults(
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
