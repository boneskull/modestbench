/**
 * ModestBench Configuration Manager
 *
 * Handles loading, merging, and validation of configuration from multiple
 * sources. Supports CLI arguments, config files (JSON/YAML/JS/TS), and
 * defaults.
 */

import { access, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import type {
  ConfigurationManager,
  ModestBenchConfig,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/index.js';

/**
 * Configuration file formats supported
 */
type ConfigFormat = 'js' | 'json' | 'ts' | 'yaml';

/**
 * Configuration loading result
 */
interface ConfigLoadResult {
  config: Partial<ModestBenchConfig>;
  format: ConfigFormat;
  source: string;
}

/**
 * Default configuration values Using minimal values to reduce test overhead
 * while maintaining functionality
 */
const DEFAULT_CONFIG: ModestBenchConfig = {
  bail: false,
  exclude: ['node_modules/**', '.git/**'],
  iterations: 2, // Reduced from 100 for test efficiency
  metadata: {},
  outputDir: './benchmark-results',
  pattern: '**/*.bench.{js,ts,mjs,mts}',
  quiet: false,
  reporterConfig: {},
  reporters: ['human'],
  tags: [],
  thresholds: {},
  time: 100, // Reduced from 5000ms (5 seconds) to 100ms
  timeout: 30000, // 30 seconds
  verbose: false,
  warmup: 0, // Reduced from 10 to 0 for faster tests
};

/**
 * Configuration precedence order (highest to lowest):
 *
 * 1. CLI arguments
 * 2. Config file
 * 3. Default values
 */
export class ModestBenchConfigurationManager implements ConfigurationManager {
  private readonly supportedConfigFiles = [
    'modestbench.config.json',
    'modestbench.config.yaml',
    'modestbench.config.yml',
    'modestbench.config.js',
    'modestbench.config.mjs',
    'modestbench.config.ts',
    '.modestbenchrc.json',
    '.modestbenchrc.yaml',
    '.modestbenchrc.yml',
    '.modestbenchrc.js',
    '.modestbenchrc.mjs',
  ];

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
      // 1. Start with defaults
      let config: Partial<ModestBenchConfig> = { ...DEFAULT_CONFIG };

      // 2. Load config file (if specified or auto-discovered)
      const fileConfig = await this.loadConfigFile(configPath);
      if (fileConfig) {
        config = this.merge(config, fileConfig.config);
      }

      // 3. Apply CLI arguments (highest precedence)
      if (cliArgs) {
        const normalizedCliArgs = this.normalizeCliArgs(cliArgs);
        config = this.merge(config, normalizedCliArgs);
      }

      // 4. Validate final configuration
      const validation = this.validate(config);
      if (!validation.valid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
        );
      }

      return config as ModestBenchConfig;
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
      if (
        typeof config.pattern !== 'string' ||
        config.pattern.trim().length === 0
      ) {
        errors.push({
          code: 'INVALID_PATTERN',
          file: 'configuration',
          message: 'pattern must be a non-empty string',
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
   * Detect configuration file format from extension
   */
  private detectConfigFormat(filePath: string): ConfigFormat {
    const ext = extname(filePath).toLowerCase();

    switch (ext) {
      case '.js':
      case '.mjs':
        return 'js';
      case '.json':
        return 'json';
      case '.ts':
        return 'ts';
      case '.yaml':
      case '.yml':
        return 'yaml';
      default:
        // Check filename patterns for rc files
        if (filePath.includes('.modestbenchrc')) {
          return 'json'; // Default rc files to JSON
        }
        throw new Error(`Unknown config file format: ${ext}`);
    }
  }

  /**
   * Auto-discover configuration file in current and parent directories
   */
  private async discoverConfigFile(): Promise<null | string> {
    let currentDir = resolve(process.cwd());

    // Search up the directory tree
    while (true) {
      // Try each supported config file in the current directory
      for (const fileName of this.supportedConfigFiles) {
        try {
          const filePath = resolve(currentDir, fileName);
          await access(filePath);
          return filePath;
        } catch {
          // File doesn't exist, try next file
          continue;
        }
      }

      // Move to parent directory
      const parentDir = resolve(currentDir, '..');

      // Stop if we've reached the root directory
      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
    }

    return null;
  }

  /**
   * Load configuration from file
   */
  private async loadConfigFile(
    configPath?: string,
  ): Promise<ConfigLoadResult | null> {
    try {
      const filePath = configPath
        ? resolve(configPath)
        : await this.discoverConfigFile();

      if (!filePath) {
        return null;
      }

      // Check if file exists
      try {
        await access(filePath);
      } catch {
        if (configPath) {
          throw new Error(`Config file not found: ${configPath}`);
        }
        return null;
      }

      const format = this.detectConfigFormat(filePath);
      const content = await readFile(filePath, 'utf-8');

      let config: Partial<ModestBenchConfig>;

      switch (format) {
        case 'json':
          config = JSON.parse(content);
          break;

        case 'yaml':
          // TODO: Implement YAML parsing
          throw new Error('YAML configuration files not yet implemented');

        case 'js':
        case 'ts':
          // TODO: Implement JS/TS module loading
          throw new Error(
            'JavaScript/TypeScript configuration files not yet implemented',
          );

        default:
          throw new Error(`Unsupported config format: ${format}`);
      }

      return {
        config,
        format,
        source: filePath,
      };
    } catch (error) {
      throw new Error(
        `Failed to load config file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
