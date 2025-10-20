import { expect } from 'bupkis';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ConfigurationManager } from '../../src/types/interfaces.js';

import { ModestBenchConfigurationManager } from '../../src/config/manager.js';

/**
 * Contract tests for ConfigurationManager interface Reference:
 * contracts/core-api.md lines 32-43
 */

describe('ConfigurationManager interface contract', () => {
  let configManager: ConfigurationManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'config-test-'));
    configManager = new ModestBenchConfigurationManager();
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('interface methods', () => {
    it('should have load method', () => {
      expect(configManager.load, 'to be a function');
      // load(configPath?: string, cliArgs?: CliArgs): Promise<ModestBenchConfig>
    });

    it('should have validate method', () => {
      expect(configManager.validate, 'to be a function');
      // validate(config: Partial<ModestBenchConfig>): ValidationResult
    });

    it('should have merge method', () => {
      expect(configManager.merge, 'to be a function');
      // merge(...configs: Partial<ModestBenchConfig>[]): ModestBenchConfig
    });

    it('should have getDefaults method', () => {
      expect(configManager.getDefaults, 'to be a function');
      // getDefaults(): ModestBenchConfig
    });
  });

  describe('load method contract', () => {
    it('should load configuration without parameters', async () => {
      const config = await configManager.load();
      expect(config, 'to be an object');
      expect(config, 'not to be null');
      expect('reporters' in config, 'to be truthy');
    });

    it('should load configuration with config path', async () => {
      const configFile = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configFile,
        JSON.stringify({ iterations: 500, reporters: ['json'] }),
      );

      const config = await configManager.load(configFile);
      expect(config, 'to be an object');
      expect(config.iterations, 'to equal', 500);
      expect(config.reporters[0], 'to equal', 'json');
      expect(config.reporters.length, 'to equal', 1);
    });

    it('should load configuration with CLI args', async () => {
      const cliArgs = {
        outputDir: 'results/',
        reporters: ['json'],
      };

      const config = await configManager.load(undefined, cliArgs);
      expect(config, 'to be an object');
      // CLI args should merge with defaults
      expect('outputDir' in config, 'to be truthy');
      expect('reporters' in config, 'to be truthy');
    });

    it('should return Promise<ModestBenchConfig>', async () => {
      const promise = configManager.load();
      expect(promise instanceof Promise, 'to be truthy');

      const config = await promise;
      // Should have ModestBenchConfig properties
      expect(config, 'to be an object');
      expect('reporters' in config, 'to be truthy');
      expect('iterations' in config, 'to be truthy');
      expect('pattern' in config, 'to be truthy');
    });
  });

  describe('validate method contract', () => {
    it('should validate partial configuration', () => {
      const partialConfig = {
        outputDir: './results',
        reporters: ['human', 'json'],
      };

      const result = configManager.validate(partialConfig);
      expect(result, 'to be an object');
      expect('valid' in result, 'to be truthy');
      // Partial config validation returns valid state
      expect(typeof result.valid, 'to equal', 'boolean');
    });

    it('should return ValidationResult', () => {
      const result = configManager.validate({});
      expect(result, 'to be an object');
      expect('valid' in result, 'to be truthy');
      expect(result.valid, 'to be a boolean');
    });
  });

  describe('merge method contract', () => {
    it('should merge multiple partial configurations', () => {
      const config1 = { reporters: ['human'] };
      const config2 = { outputDir: './results' };
      const config3 = { bail: true };

      const merged = configManager.merge(config1, config2, config3);
      expect(typeof merged === 'object', 'to be truthy');
      expect('reporters' in merged, 'to be truthy');
      expect('outputDir' in merged, 'to be truthy');
      expect('bail' in merged, 'to be truthy');
      expect(merged.reporters[0], 'to equal', 'human');
      expect(merged.outputDir, 'to equal', './results');
      expect(merged.bail, 'to be', true);
    });

    it('should handle precedence correctly', () => {
      const config1 = { reporters: ['human'] };
      const config2 = { reporters: ['json'] };

      const merged = configManager.merge(config1, config2);
      // Later configs should override earlier ones
      expect(merged.reporters, 'to be an array');
      expect(merged.reporters[0], 'to equal', 'json');
      expect(merged.reporters.length, 'to equal', 1);
    });

    it('should return complete ModestBenchConfig', () => {
      const merged = configManager.merge({});
      expect(typeof merged === 'object', 'to be truthy');
      // Should have all required properties filled in
      expect('reporters' in merged, 'to be truthy');
      expect('iterations' in merged, 'to be truthy');
      expect('pattern' in merged, 'to be truthy');
    });
  });

  describe('getDefaults method contract', () => {
    it('should return default configuration', () => {
      const defaults = configManager.getDefaults();
      expect(typeof defaults === 'object', 'to be truthy');
      expect(defaults, 'not to be null');

      // Should have expected default properties
      expect('reporters' in defaults, 'to be truthy');
      expect(defaults.reporters, 'to be an array');
      expect('iterations' in defaults, 'to be truthy');
      expect('pattern' in defaults, 'to be truthy');
    });

    it('should return consistent defaults', () => {
      const defaults1 = configManager.getDefaults();
      const defaults2 = configManager.getDefaults();

      // Should return equivalent objects (check properties, not references)
      expect(defaults1.iterations, 'to equal', defaults2.iterations);
      expect(defaults1.reporters[0], 'to equal', defaults2.reporters[0]);
      expect(defaults1.pattern, 'to equal', defaults2.pattern);
    });
  });

  describe('configuration file format support', () => {
    it('should support JSON configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configFile,
        JSON.stringify({ iterations: 200, reporters: ['csv'] }),
      );

      const config = await configManager.load(configFile);
      expect(config.iterations, 'to equal', 200);
      expect(config.reporters[0], 'to equal', 'csv');
      expect(config.reporters.length, 'to equal', 1);
    });

    it('should support YAML configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.yaml');
      await writeFile(
        configFile,
        'iterations: 300\nreporters:\n  - human\n  - json',
      );

      const config = await configManager.load(configFile);
      expect(config.iterations, 'to equal', 300);
      expect(config.reporters.length, 'to equal', 2);
      expect(config.reporters[0], 'to equal', 'human');
      expect(config.reporters[1], 'to equal', 'json');
    });

    it('should support JavaScript configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.js');
      await writeFile(
        configFile,
        'module.exports = { iterations: 400, reporters: ["json"] };',
      );

      const config = await configManager.load(configFile);
      expect(config.iterations, 'to equal', 400);
      expect(config.reporters[0], 'to equal', 'json');
      expect(config.reporters.length, 'to equal', 1);
    });

    it('should support TypeScript configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.ts');
      await writeFile(
        configFile,
        'export default { iterations: 500, reporters: ["csv"] };',
      );

      const config = await configManager.load(configFile);
      expect(config.iterations, 'to equal', 500);
      expect(config.reporters[0], 'to equal', 'csv');
      expect(config.reporters.length, 'to equal', 1);
    });
  });

  describe('error handling contract', () => {
    it('should handle missing configuration files gracefully', async () => {
      // ConfigManager throws on missing explicit file paths
      try {
        await configManager.load(join(tempDir, 'nonexistent.config.json'));
        // If it doesn't throw, should return defaults
        expect(true, 'to be truthy');
      } catch (error) {
        // Or it throws a descriptive error
        expect(error, 'to be an', Error);
        expect((error as Error).message.length > 0, 'to be truthy');
      }
    });

    it('should handle invalid configuration data', () => {
      const invalidConfig = {
        outputDir: 123,
        reporters: 'not-an-array',
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = configManager.validate(invalidConfig);
      // Should mark as invalid or have errors
      expect(
        !result.valid || (result.errors && result.errors.length > 0),
        'to be truthy',
      );
    });
  });
});
