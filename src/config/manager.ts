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

/**
 * Default configuration values Using minimal values to reduce test overhead
 * while maintaining functionality
 */
const DEFAULT_CONFIG: ModestBenchConfig = {
  bail: false,
  exclude: ['node_modules/**', '.git/**'],
  iterations: 100, // Sufficient iterations for reliable statistics
  metadata: {},
  outputDir: './benchmark-results',
  pattern: '**/*.bench.{js,ts,mjs,mts}',
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
      const explorer = this.createExplorer();

      // 1. Load config file using cosmiconfig
      const result = configPath
        ? await explorer.load(resolve(configPath))
        : await explorer.search();

      const fileConfig = (result?.config || {}) as Partial<ModestBenchConfig>;

      // 2. Merge: defaults <- file <- CLI args
      const merged = this.merge(
        DEFAULT_CONFIG,
        fileConfig,
        cliArgs ? this.normalizeCliArgs(cliArgs) : {},
      );

      // 3. Validate final configuration
      const validation = this.validate(merged);
      if (!validation.valid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
        );
      }

      return merged;
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
   * Validate configuration object
   */
  validate(config: Partial<ModestBenchConfig>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (config.iterations !== undefined) {
      if (typeof config.iterations !== 'number' || config.iterations <= 0) {
        errors.push({
          code: 'INVALID_ITERATIONS',
          file: 'configuration',
          message: 'iterations must be a positive number',
          severity: 'error',
        });
      }
    }

    if (config.time !== undefined) {
      if (typeof config.time !== 'number' || config.time <= 0) {
        errors.push({
          code: 'INVALID_TIME',
          file: 'configuration',
          message: 'time must be a positive number',
          severity: 'error',
        });
      }
    }

    if (config.warmup !== undefined) {
      if (typeof config.warmup !== 'number' || config.warmup < 0) {
        errors.push({
          code: 'INVALID_WARMUP',
          file: 'configuration',
          message: 'warmup must be a non-negative number',
          severity: 'error',
        });
      }
    }

    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout <= 0) {
        errors.push({
          code: 'INVALID_TIMEOUT',
          file: 'configuration',
          message: 'timeout must be a positive number',
          severity: 'error',
        });
      }
    }

    if (config.pattern !== undefined) {
      // Pattern can be a string or an array of strings
      if (Array.isArray(config.pattern)) {
        if (config.pattern.length === 0) {
          errors.push({
            code: 'INVALID_PATTERN',
            file: 'configuration',
            message: 'pattern array must not be empty',
            severity: 'error',
          });
        } else if (
          !config.pattern.every(
            (p) => typeof p === 'string' && p.trim().length > 0,
          )
        ) {
          errors.push({
            code: 'INVALID_PATTERN',
            file: 'configuration',
            message: 'pattern array must contain only non-empty strings',
            severity: 'error',
          });
        }
      } else if (
        typeof config.pattern !== 'string' ||
        config.pattern.trim().length === 0
      ) {
        errors.push({
          code: 'INVALID_PATTERN',
          file: 'configuration',
          message: 'pattern must be a non-empty string or array of strings',
          severity: 'error',
        });
      }
    }

    if (config.exclude !== undefined) {
      if (!Array.isArray(config.exclude)) {
        errors.push({
          code: 'INVALID_EXCLUDE',
          file: 'configuration',
          message: 'exclude must be an array of strings',
          severity: 'error',
        });
      } else if (!config.exclude.every((item) => typeof item === 'string')) {
        errors.push({
          code: 'INVALID_EXCLUDE_ITEMS',
          file: 'configuration',
          message: 'exclude array must contain only strings',
          severity: 'error',
        });
      }
    }

    if (config.reporters !== undefined) {
      if (!Array.isArray(config.reporters)) {
        errors.push({
          code: 'INVALID_REPORTERS',
          file: 'configuration',
          message: 'reporters must be an array of strings',
          severity: 'error',
        });
      } else if (!config.reporters.every((item) => typeof item === 'string')) {
        errors.push({
          code: 'INVALID_REPORTER_ITEMS',
          file: 'configuration',
          message: 'reporters array must contain only strings',
          severity: 'error',
        });
      } else if (config.reporters.length === 0) {
        warnings.push({
          code: 'NO_REPORTERS',
          file: 'configuration',
          message: 'no reporters specified, using default human reporter',
          severity: 'warning',
        });
      }
    }

    // Logical validation
    if (config.iterations !== undefined && config.time !== undefined) {
      if (config.iterations > 1000 && config.time > 60000) {
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
      loaders: {
        '.ts': async (filepath: string) => {
          // Use dynamic import to load TypeScript files
          // tsx is already in dev dependencies and will handle TS compilation
          const module = (await import(filepath)) as {
            [key: string]: unknown;
            default?: unknown;
          };
          return module.default || module;
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
        'modestbench.config.json',
        'modestbench.config.yaml',
        'modestbench.config.yml',
        'modestbench.config.js',
        'modestbench.config.mjs',
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
