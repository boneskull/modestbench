import { expect, expectAsync } from 'bupkis';
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
      expect(config, 'to be an object', 'and', 'to have property', 'reporters');
    });

    it('should load configuration with config path', async () => {
      const configFile = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configFile,
        JSON.stringify({ iterations: 500, reporters: ['json'] }),
      );

      const config = await configManager.load(configFile);
      expect(config, 'to satisfy', {
        iterations: 500,
        reporters: expect.it('to deep equal', ['json']),
      });
    });

    it('should load configuration with CLI args', async () => {
      const cliArgs = {
        outputDir: 'results/',
        reporters: ['json'],
      };

      const config = await configManager.load(undefined, cliArgs);
      // CLI args should merge with defaults
      expect(config, 'to have properties', ['outputDir', 'reporters']);
    });

    it('should return Promise<ModestBenchConfig>', async () => {
      const promise = configManager.load();
      expect(promise instanceof Promise, 'to be truthy');

      const config = await promise;
      // Should have ModestBenchConfig properties
      expect(config, 'to satisfy', {
        iterations: expect.it('to be defined'),
        pattern: expect.it('to be defined'),
        reporters: expect.it('to be defined'),
      });
    });
  });

  describe('validate method contract', () => {
    it('should validate partial configuration', () => {
      const partialConfig = {
        outputDir: './results',
        reporters: ['human', 'json'],
      };

      const result = configManager.validate(partialConfig);
      expect(result, 'to satisfy', {
        valid: expect.it('to be a boolean'),
      });
    });

    it('should return ValidationResult', () => {
      const result = configManager.validate({});
      expect(result, 'to satisfy', {
        valid: expect.it('to be a boolean'),
      });
    });
  });

  describe('merge method contract', () => {
    it('should merge multiple partial configurations', () => {
      const config1 = { reporters: ['human'] };
      const config2 = { outputDir: './results' };
      const config3 = { bail: true };

      const merged = configManager.merge(config1, config2, config3);
      expect(merged, 'to satisfy', {
        bail: true,
        outputDir: './results',
        reporters: expect.it('to deep equal', ['human']),
      });
    });

    it('should handle precedence correctly', () => {
      const config1 = { reporters: ['human'] };
      const config2 = { reporters: ['json'] };

      const merged = configManager.merge(config1, config2);
      // Later configs should override earlier ones
      expect(merged, 'to satisfy', {
        reporters: expect.it('to deep equal', ['json']),
      });
    });

    it('should return complete ModestBenchConfig', () => {
      const merged = configManager.merge({});
      // Should have all required properties filled in
      expect(merged, 'to satisfy', {
        iterations: expect.it('to be defined'),
        pattern: expect.it('to be defined'),
        reporters: expect.it('to be defined'),
      });
    });
  });

  describe('getDefaults method contract', () => {
    it('should return default configuration', () => {
      const defaults = configManager.getDefaults();
      // Should have expected default properties
      expect(defaults, 'to satisfy', {
        iterations: expect.it('to be defined'),
        pattern: expect.it('to be defined'),
        reporters: expect.it('to be an array'),
      });
    });

    it('should return consistent defaults', () => {
      const defaults1 = configManager.getDefaults();
      const defaults2 = configManager.getDefaults();

      // Should return equivalent objects (check properties, not references)
      expect(defaults1, 'to satisfy', {
        iterations: defaults2.iterations,
        pattern: defaults2.pattern,
        reporters: [defaults2.reporters[0]],
      });
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
      expect(config, 'to satisfy', {
        iterations: 200,
        reporters: expect.it('to deep equal', ['csv']),
      });
    });

    it('should support YAML configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.yaml');
      await writeFile(
        configFile,
        'iterations: 300\nreporters:\n  - human\n  - json',
      );

      const config = await configManager.load(configFile);
      expect(config, 'to satisfy', {
        iterations: 300,
        reporters: expect.it('to deep equal', ['human', 'json']),
      });
    });

    it('should support JavaScript configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.js');
      await writeFile(
        configFile,
        'module.exports = { iterations: 400, reporters: ["json"] };',
      );

      const config = await configManager.load(configFile);
      expect(config, 'to satisfy', {
        iterations: 400,
        reporters: expect.it('to deep equal', ['json']),
      });
    });

    it('should support TypeScript configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.ts');
      await writeFile(
        configFile,
        'export default { iterations: 500, reporters: ["csv"] };',
      );

      const config = await configManager.load(configFile);
      expect(config, 'to satisfy', {
        iterations: 500,
        reporters: expect.it('to deep equal', ['csv']),
      });
    });
  });

  describe('error handling contract', () => {
    it('should throw when loading missing configuration file', async () => {
      // ConfigManager throws on missing explicit file paths
      await expectAsync(
        configManager.load(join(tempDir, 'nonexistent.config.json')),
        'to reject',
      );
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
