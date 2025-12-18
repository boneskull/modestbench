/**
 * Tests for loading configuration in different formats (JSON, YAML, JS, TS)
 */

import { expect, expectAsync } from 'bupkis';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ModestBenchConfigurationManager } from '../../src/services/config-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '..', 'fixtures', 'config');

describe('Configuration format loading', () => {
  describe('JSON configuration files', () => {
    it('should load .json configuration files', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.json');

      const config = await manager.load(configPath);

      expect(config, 'to satisfy', {
        iterations: 500,
        pattern: 'test/**/*.bench.ts',
        time: 2000,
        verbose: true,
        warmup: 100,
      });
      expect(
        config.reporters,
        'to be an array',
        'and',
        'to contain',
        'human',
        'and',
        'to contain',
        'json',
      );
      expect(config.tags, 'to contain', 'json');
    });

    it('should merge JSON config with CLI args', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.json');

      const config = await manager.load(configPath, {
        iterations: 1000, // Override JSON value of 500
        quiet: true, // Override JSON value of false
      });

      expect(config, 'to satisfy', {
        iterations: 1000, // CLI override
        pattern: 'test/**/*.bench.ts', // From JSON
        quiet: true, // CLI override
        time: 2000, // From JSON
      });
    });

    it('should handle nested objects in JSON', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.json');

      const config = await manager.load(configPath);

      expect(config, 'to satisfy', {
        metadata: {
          format: 'json',
          testFile: true,
        },
        reporterConfig: {
          human: expect.it('to be truthy'),
        },
        thresholds: {
          maxMean: 1000,
        },
      });
    });
  });

  describe('YAML configuration files', () => {
    it('should load .yaml configuration files', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      const config = await manager.load(configPath);

      expect(config, 'to satisfy', {
        iterations: 500,
        pattern: 'test/**/*.bench.ts',
        time: 2000,
        verbose: true,
        warmup: 100,
      });
      expect(
        config.reporters,
        'to be an array',
        'and',
        'to contain',
        'human',
        'and',
        'to contain',
        'json',
      );
      expect(config.tags, 'to contain', 'yaml');
    });

    it('should merge YAML config with CLI args', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      const config = await manager.load(configPath, {
        iterations: 1000, // Override YAML value of 500
        quiet: true, // Override YAML value of false
      });

      expect(config, 'to satisfy', {
        iterations: 1000, // CLI override
        pattern: 'test/**/*.bench.ts', // From YAML
        quiet: true, // CLI override
        time: 2000, // From YAML
      });
    });
  });

  describe('JavaScript configuration files', () => {
    it('should load .js configuration files', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.js');

      const config = await manager.load(configPath);

      expect(config, 'to satisfy', {
        iterations: 500,
        pattern: 'test/**/*.bench.ts',
        time: 2000,
        verbose: true,
        warmup: 100,
      });
      expect(
        config.reporters,
        'to be an array',
        'and',
        'to contain',
        'human',
        'and',
        'to contain',
        'json',
      );
      expect(config.tags, 'to contain', 'javascript');
    });

    it('should merge JS config with CLI args', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.js');

      const config = await manager.load(configPath, {
        bail: true, // Override JS value of false
        iterations: 1000, // Override JS value of 500
      });

      expect(config, 'to satisfy', {
        bail: true, // CLI override
        iterations: 1000, // CLI override
        pattern: 'test/**/*.bench.ts', // From JS
        time: 2000, // From JS
      });
    });
  });

  describe('TypeScript configuration files', () => {
    it('should load .ts configuration files', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.ts');

      const config = await manager.load(configPath);

      expect(config, 'to satisfy', {
        iterations: 500,
        pattern: 'test/**/*.bench.ts',
        time: 2000,
        verbose: true,
        warmup: 100,
      });
      expect(
        config.reporters,
        'to be an array',
        'and',
        'to contain',
        'human',
        'and',
        'to contain',
        'json',
      );
      expect(config.tags, 'to contain', 'typescript');
    });

    it('should merge TS config with CLI args', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.ts');

      const config = await manager.load(configPath, {
        iterations: 1000, // Override TS value of 500
        timeout: 120_000, // Override TS value of 60000
      });

      expect(config, 'to satisfy', {
        iterations: 1000, // CLI override
        pattern: 'test/**/*.bench.ts', // From TS
        time: 2000, // From TS
        timeout: 120_000, // CLI override
      });
    });

    it('should support TypeScript type definitions', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.ts');

      const config = await manager.load(configPath);

      // Verify that the config has the expected structure
      expect(config, 'to be an object');
      expect(config, 'to have key', 'pattern');
      expect(config, 'to have key', 'iterations');
      expect(config, 'to have key', 'reporters');

      // Verify metadata from TS config
      expect(config, 'to satisfy', {
        metadata: {
          format: 'typescript',
          testFile: true,
        },
      });
    });
  });

  describe('Configuration precedence', () => {
    it('should respect precedence: CLI > File > Defaults', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      const config = await manager.load(configPath, {
        iterations: 2000, // CLI
      });

      expect(config, 'to satisfy', {
        bail: false, // Default value used (not in CLI or file)
        iterations: 2000, // CLI value wins
        time: 2000, // File value used (not in CLI)
      });
    });
  });

  describe('Complex nested configuration', () => {
    it('should handle nested objects in YAML', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      const config = await manager.load(configPath);

      expect(config, 'to satisfy', {
        metadata: {
          format: 'yaml',
          testFile: true,
        },
        thresholds: {
          maxMean: 1000,
        },
      });
    });

    it('should handle nested objects in JS', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.js');

      const config = await manager.load(configPath);

      expect(config, 'to satisfy', {
        metadata: {
          format: 'javascript',
          testFile: true,
        },
        reporterConfig: {
          human: expect.it('to be truthy'),
        },
      });
    });

    it('should handle nested objects in TS', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.ts');

      const config = await manager.load(configPath);

      expect(config, 'to satisfy', {
        metadata: {
          format: 'typescript',
          testFile: true,
        },
        thresholds: {
          maxMean: 1000,
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle missing config files gracefully', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'non-existent.yaml');

      await expectAsync(
        manager.load(configPath),
        'to reject with error satisfying',
        /Failed to load configuration/,
      );
    });

    it('should validate config values from all formats', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      // Valid config should load
      const config = await manager.load(configPath);
      expect(config, 'to be truthy');

      // Invalid CLI override should fail validation
      await expectAsync(
        manager.load(configPath, {
          iterations: -1, // Invalid: must be positive
        }),
        'to reject with error satisfying',
        /Configuration validation failed/,
      );
    });
  });
});
