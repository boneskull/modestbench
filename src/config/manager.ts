/**
 * ModestBench Configuration Manager
 * 
 * Handles loading, merging, and validation of configuration from multiple sources.
 * Supports CLI arguments, config files (JSON/YAML/JS/TS), and defaults.
 */

import { readFile, access } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ConfigurationManager,
  ModestBenchConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types/index.js';

/**
 * Configuration file formats supported
 */
type ConfigFormat = 'json' | 'yaml' | 'js' | 'ts';

/**
 * Configuration loading result
 */
interface ConfigLoadResult {
  config: Partial<ModestBenchConfig>;
  source: string;
  format: ConfigFormat;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ModestBenchConfig = {
  iterations: 100,
  time: 5000, // 5 seconds
  warmup: 10,
  concurrent: false,
  timeout: 30000, // 30 seconds
  bail: false,
  pattern: '**/*.bench.{js,ts}',
  exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
  outputDir: './benchmark-results',
  reporters: ['human'],
  quiet: false,
  verbose: false,
  tags: [],
  reporterConfig: {},
  metadata: {},
  thresholds: {},
};

/**
 * Configuration precedence order (highest to lowest):
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
   * Load configuration from various sources with precedence
   */
  async load(configPath?: string, cliArgs?: Record<string, unknown>): Promise<ModestBenchConfig> {
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
        throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      return config as ModestBenchConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
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
          file: 'configuration',
          message: 'iterations must be a positive number',
          code: 'INVALID_ITERATIONS',
          severity: 'error',
        });
      }
    }

    if (config.time !== undefined) {
      if (typeof config.time !== 'number' || config.time <= 0) {
        errors.push({
          file: 'configuration',
          message: 'time must be a positive number',
          code: 'INVALID_TIME',
          severity: 'error',
        });
      }
    }

    if (config.warmup !== undefined) {
      if (typeof config.warmup !== 'number' || config.warmup < 0) {
        errors.push({
          file: 'configuration',
          message: 'warmup must be a non-negative number',
          code: 'INVALID_WARMUP',
          severity: 'error',
        });
      }
    }

    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout <= 0) {
        errors.push({
          file: 'configuration',
          message: 'timeout must be a positive number',
          code: 'INVALID_TIMEOUT',
          severity: 'error',
        });
      }
    }

    if (config.pattern !== undefined) {
      if (typeof config.pattern !== 'string' || config.pattern.trim().length === 0) {
        errors.push({
          file: 'configuration',
          message: 'pattern must be a non-empty string',
          code: 'INVALID_PATTERN',
          severity: 'error',
        });
      }
    }

    if (config.exclude !== undefined) {
      if (!Array.isArray(config.exclude)) {
        errors.push({
          file: 'configuration',
          message: 'exclude must be an array of strings',
          code: 'INVALID_EXCLUDE',
          severity: 'error',
        });
      } else if (!config.exclude.every(item => typeof item === 'string')) {
        errors.push({
          file: 'configuration',
          message: 'exclude array must contain only strings',
          code: 'INVALID_EXCLUDE_ITEMS',
          severity: 'error',
        });
      }
    }

    if (config.reporters !== undefined) {
      if (!Array.isArray(config.reporters)) {
        errors.push({
          file: 'configuration',
          message: 'reporters must be an array of strings',
          code: 'INVALID_REPORTERS',
          severity: 'error',
        });
      } else if (!config.reporters.every(item => typeof item === 'string')) {
        errors.push({
          file: 'configuration',
          message: 'reporters array must contain only strings',
          code: 'INVALID_REPORTER_ITEMS',
          severity: 'error',
        });
      } else if (config.reporters.length === 0) {
        warnings.push({
          file: 'configuration',
          message: 'no reporters specified, using default human reporter',
          code: 'NO_REPORTERS',
          severity: 'warning',
        });
      }
    }

    // Logical validation
    if (config.iterations !== undefined && config.time !== undefined) {
      if (config.iterations > 1000 && config.time > 60000) {
        warnings.push({
          file: 'configuration',
          message: 'high iterations and time values may result in very long benchmark runs',
          code: 'LONG_RUNTIME_WARNING',
          severity: 'warning',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      files: ['configuration'],
    };
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
          reporterConfig: { ...result.reporterConfig, ...config.reporterConfig }
        }),
        ...(config.metadata && {
          metadata: { ...result.metadata, ...config.metadata }
        }),
        ...(config.thresholds && {
          thresholds: { ...result.thresholds, ...config.thresholds }
        }),
      };
    }

    return { ...DEFAULT_CONFIG, ...result };
  }

  /**
   * Get default configuration values
   */
  getDefaults(): ModestBenchConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Load configuration from file
   */
  private async loadConfigFile(configPath?: string): Promise<ConfigLoadResult | null> {
    try {
      const filePath = configPath ? resolve(configPath) : await this.discoverConfigFile();
      
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
          throw new Error('JavaScript/TypeScript configuration files not yet implemented');
        
        default:
          throw new Error(`Unsupported config format: ${format}`);
      }

      return {
        config,
        source: filePath,
        format,
      };
    } catch (error) {
      throw new Error(`Failed to load config file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Auto-discover configuration file in current directory
   */
  private async discoverConfigFile(): Promise<string | null> {
    for (const fileName of this.supportedConfigFiles) {
      try {
        const filePath = resolve(fileName);
        await access(filePath);
        return filePath;
      } catch {
        // File doesn't exist, try next
        continue;
      }
    }
    return null;
  }

  /**
   * Detect configuration file format from extension
   */
  private detectConfigFormat(filePath: string): ConfigFormat {
    const ext = extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.json':
        return 'json';
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.js':
      case '.mjs':
        return 'js';
      case '.ts':
        return 'ts';
      default:
        // Check filename patterns for rc files
        if (filePath.includes('.modestbenchrc')) {
          return 'json'; // Default rc files to JSON
        }
        throw new Error(`Unknown config file format: ${ext}`);
    }
  }

  /**
   * Normalize CLI arguments to configuration format
   */
  private normalizeCliArgs(cliArgs: Record<string, unknown>): Partial<ModestBenchConfig> {
    const normalized: Record<string, unknown> = {};

    // Map CLI argument names to config property names
    const argMap: Record<string, keyof ModestBenchConfig> = {
      i: 'iterations',
      iterations: 'iterations',
      t: 'time',
      time: 'time',
      w: 'warmup',
      warmup: 'warmup',
      concurrent: 'concurrent',
      timeout: 'timeout',
      bail: 'bail',
      pattern: 'pattern',
      exclude: 'exclude',
      o: 'outputDir',
      output: 'outputDir',
      'output-dir': 'outputDir',
      r: 'reporters',
      reporters: 'reporters',
      q: 'quiet',
      quiet: 'quiet',
      v: 'verbose',
      verbose: 'verbose',
      tags: 'tags',
    };

    for (const [cliKey, configKey] of Object.entries(argMap)) {
      if (cliKey in cliArgs && cliArgs[cliKey] !== undefined) {
        const value = cliArgs[cliKey];
        
        // Handle array arguments that might come as strings
        if (configKey === 'exclude' || configKey === 'reporters' || configKey === 'tags') {
          if (typeof value === 'string') {
            normalized[configKey] = value.split(',').map(s => s.trim());
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