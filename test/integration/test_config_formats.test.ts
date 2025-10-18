/**
 * Tests for loading configuration in different formats (JSON, YAML, JS, TS)
 */

import assert from 'node:assert';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ModestBenchConfigurationManager } from '../../src/config/manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '..', 'fixtures', 'config');

describe('Configuration format loading', () => {
  describe('JSON configuration files', () => {
    it('should load .json configuration files', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.json');

      const config = await manager.load(configPath);

      assert.strictEqual(config.pattern, 'test/**/*.bench.ts');
      assert.strictEqual(config.iterations, 500);
      assert.strictEqual(config.time, 2000);
      assert.strictEqual(config.warmup, 100);
      assert.strictEqual(config.verbose, true);
      assert.ok(Array.isArray(config.reporters));
      assert.ok(config.reporters.includes('human'));
      assert.ok(config.reporters.includes('json'));
      assert.ok(config.tags.includes('json'));
    });

    it('should merge JSON config with CLI args', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.json');

      const config = await manager.load(configPath, {
        iterations: 1000, // Override JSON value of 500
        quiet: true, // Override JSON value of false
      });

      assert.strictEqual(config.iterations, 1000); // CLI override
      assert.strictEqual(config.quiet, true); // CLI override
      assert.strictEqual(config.time, 2000); // From JSON
      assert.strictEqual(config.pattern, 'test/**/*.bench.ts'); // From JSON
    });

    it('should handle nested objects in JSON', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.json');

      const config = await manager.load(configPath);

      assert.ok(config.metadata);
      assert.strictEqual(config.metadata.format, 'json');
      assert.strictEqual(config.metadata.testFile, true);

      assert.ok(config.thresholds);
      assert.strictEqual(config.thresholds.maxMean, 1000);

      assert.ok(config.reporterConfig);
      assert.ok(config.reporterConfig.human);
    });
  });

  describe('YAML configuration files', () => {
    it('should load .yaml configuration files', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      const config = await manager.load(configPath);

      assert.strictEqual(config.pattern, 'test/**/*.bench.ts');
      assert.strictEqual(config.iterations, 500);
      assert.strictEqual(config.time, 2000);
      assert.strictEqual(config.warmup, 100);
      assert.strictEqual(config.verbose, true);
      assert.ok(Array.isArray(config.reporters));
      assert.ok(config.reporters.includes('human'));
      assert.ok(config.reporters.includes('json'));
      assert.ok(config.tags.includes('yaml'));
    });

    it('should merge YAML config with CLI args', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      const config = await manager.load(configPath, {
        iterations: 1000, // Override YAML value of 500
        quiet: true, // Override YAML value of false
      });

      assert.strictEqual(config.iterations, 1000); // CLI override
      assert.strictEqual(config.quiet, true); // CLI override
      assert.strictEqual(config.time, 2000); // From YAML
      assert.strictEqual(config.pattern, 'test/**/*.bench.ts'); // From YAML
    });
  });

  describe('JavaScript configuration files', () => {
    it('should load .js configuration files', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.js');

      const config = await manager.load(configPath);

      assert.strictEqual(config.pattern, 'test/**/*.bench.ts');
      assert.strictEqual(config.iterations, 500);
      assert.strictEqual(config.time, 2000);
      assert.strictEqual(config.warmup, 100);
      assert.strictEqual(config.verbose, true);
      assert.ok(Array.isArray(config.reporters));
      assert.ok(config.reporters.includes('human'));
      assert.ok(config.reporters.includes('json'));
      assert.ok(config.tags.includes('javascript'));
    });

    it('should merge JS config with CLI args', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.js');

      const config = await manager.load(configPath, {
        bail: true, // Override JS value of false
        iterations: 1000, // Override JS value of 500
      });

      assert.strictEqual(config.iterations, 1000); // CLI override
      assert.strictEqual(config.bail, true); // CLI override
      assert.strictEqual(config.time, 2000); // From JS
      assert.strictEqual(config.pattern, 'test/**/*.bench.ts'); // From JS
    });
  });

  describe('TypeScript configuration files', () => {
    it('should load .ts configuration files', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.ts');

      const config = await manager.load(configPath);

      assert.strictEqual(config.pattern, 'test/**/*.bench.ts');
      assert.strictEqual(config.iterations, 500);
      assert.strictEqual(config.time, 2000);
      assert.strictEqual(config.warmup, 100);
      assert.strictEqual(config.verbose, true);
      assert.ok(Array.isArray(config.reporters));
      assert.ok(config.reporters.includes('human'));
      assert.ok(config.reporters.includes('json'));
      assert.ok(config.tags.includes('typescript'));
    });

    it('should merge TS config with CLI args', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.ts');

      const config = await manager.load(configPath, {
        iterations: 1000, // Override TS value of 500
        timeout: 120000, // Override TS value of 60000
      });

      assert.strictEqual(config.iterations, 1000); // CLI override
      assert.strictEqual(config.timeout, 120000); // CLI override
      assert.strictEqual(config.time, 2000); // From TS
      assert.strictEqual(config.pattern, 'test/**/*.bench.ts'); // From TS
    });

    it('should support TypeScript type definitions', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.ts');

      const config = await manager.load(configPath);

      // Verify that the config has the expected structure
      assert.ok(typeof config === 'object');
      assert.ok('pattern' in config);
      assert.ok('iterations' in config);
      assert.ok('reporters' in config);

      // Verify metadata from TS config
      assert.ok(config.metadata);
      assert.strictEqual(config.metadata.format, 'typescript');
      assert.strictEqual(config.metadata.testFile, true);
    });
  });

  describe('Configuration precedence', () => {
    it('should respect precedence: CLI > File > Defaults', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      const config = await manager.load(configPath, {
        iterations: 2000, // CLI
      });

      // CLI value wins
      assert.strictEqual(config.iterations, 2000);

      // File value used (not in CLI)
      assert.strictEqual(config.time, 2000);

      // Default value used (not in CLI or file)
      assert.strictEqual(config.bail, false);
    });
  });

  describe('Complex nested configuration', () => {
    it('should handle nested objects in YAML', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      const config = await manager.load(configPath);

      assert.ok(config.metadata);
      assert.strictEqual(config.metadata.format, 'yaml');
      assert.strictEqual(config.metadata.testFile, true);

      assert.ok(config.thresholds);
      assert.strictEqual(config.thresholds.maxMean, 1000);
    });

    it('should handle nested objects in JS', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.js');

      const config = await manager.load(configPath);

      assert.ok(config.metadata);
      assert.strictEqual(config.metadata.format, 'javascript');
      assert.strictEqual(config.metadata.testFile, true);

      assert.ok(config.reporterConfig);
      assert.ok(config.reporterConfig.human);
    });

    it('should handle nested objects in TS', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.ts');

      const config = await manager.load(configPath);

      assert.ok(config.metadata);
      assert.strictEqual(config.metadata.format, 'typescript');
      assert.strictEqual(config.metadata.testFile, true);

      assert.ok(config.thresholds);
      assert.strictEqual(config.thresholds.maxMean, 1000);
    });
  });

  describe('Error handling', () => {
    it('should handle missing config files gracefully', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'non-existent.yaml');

      await assert.rejects(
        async () => await manager.load(configPath),
        /Failed to load configuration/,
      );
    });

    it('should validate config values from all formats', async () => {
      const manager = new ModestBenchConfigurationManager();
      const configPath = join(fixturesDir, 'test-config.yaml');

      // Valid config should load
      const config = await manager.load(configPath);
      assert.ok(config);

      // Invalid CLI override should fail validation
      await assert.rejects(
        async () =>
          await manager.load(configPath, {
            iterations: -1, // Invalid: must be positive
          }),
        /Configuration validation failed/,
      );
    });
  });
});
