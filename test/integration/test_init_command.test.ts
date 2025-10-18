/**
 * Integration tests for `modestbench init` command
 *
 * Tests verify that:
 *
 * - Config files are generated correctly
 * - Generated files can be loaded by cosmiconfig
 * - Generated configs contain expected values
 * - All config formats (JSON, YAML, JS, TS) work
 */

import { strict as assert } from 'node:assert';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { ModestBenchConfigurationManager } from '../../src/config/manager.js';
import { runCommand } from '../util.js';

describe('modestbench init command - integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-init-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('JSON config generation', () => {
    it('should create valid JSON config file', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'json', '--no-examples'],
        tempDir,
      );

      assert.strictEqual(result.exitCode, 0, `Init failed: ${result.stderr}`);

      // Verify file exists
      const configPath = join(tempDir, 'modestbench.config.json');
      await access(configPath); // Throws if file doesn't exist

      // Verify file content is valid JSON
      const content = await readFile(configPath, 'utf8');
      const config = JSON.parse(content);

      // Verify basic structure
      assert.ok(config.pattern, 'Config should have pattern');
      assert.ok(config.reporters, 'Config should have reporters');
      assert.ok(
        typeof config.iterations === 'number',
        'Iterations should be a number',
      );
    });

    it('should generate config loadable by cosmiconfig', async () => {
      await runCommand(
        ['init', '--config-type', 'json', '--no-examples'],
        tempDir,
      );

      const manager = new ModestBenchConfigurationManager();
      const configPath = join(tempDir, 'modestbench.config.json');
      const config = await manager.load(configPath);

      // Verify cosmiconfig successfully loaded and validated the config
      assert.ok(config.pattern);
      assert.ok(Array.isArray(config.reporters));
      assert.ok(typeof config.iterations === 'number');
    });
  });

  describe('YAML config generation', () => {
    it('should create valid YAML config file', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'yaml', '--no-examples'],
        tempDir,
      );

      assert.strictEqual(result.exitCode, 0, `Init failed: ${result.stderr}`);

      // Verify file exists
      const configPath = join(tempDir, 'modestbench.config.yaml');
      await access(configPath);

      // Verify file content doesn't have escaped newlines
      const content = await readFile(configPath, 'utf8');
      assert.ok(
        !content.includes('\\n'),
        'YAML should not contain escaped newlines',
      );
      assert.ok(content.includes('\n'), 'YAML should contain actual newlines');

      // Verify it has proper YAML structure
      assert.ok(content.includes('pattern:'), 'YAML should have pattern field');
      assert.ok(
        content.includes('reporters:'),
        'YAML should have reporters field',
      );
    });

    it('should generate config loadable by cosmiconfig', async () => {
      await runCommand(
        ['init', '--config-type', 'yaml', '--no-examples'],
        tempDir,
      );

      const manager = new ModestBenchConfigurationManager();
      const configPath = join(tempDir, 'modestbench.config.yaml');
      const config = await manager.load(configPath);

      // Verify cosmiconfig successfully loaded and validated the config
      assert.ok(config.pattern);
      assert.ok(Array.isArray(config.reporters));
      assert.ok(typeof config.iterations === 'number');
    });

    it('should generate YAML with proper array formatting', async () => {
      await runCommand(
        ['init', 'advanced', '--config-type', 'yaml', '--no-examples'],
        tempDir,
      );

      const content = await readFile(
        join(tempDir, 'modestbench.config.yaml'),
        'utf8',
      );

      // YAML arrays should use dash syntax
      assert.ok(
        content.includes('  - '),
        'YAML should have array items with dashes',
      );
    });
  });

  describe('JavaScript config generation', () => {
    it('should create valid JavaScript config file', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'js', '--no-examples'],
        tempDir,
      );

      assert.strictEqual(result.exitCode, 0, `Init failed: ${result.stderr}`);

      // Verify file exists
      const configPath = join(tempDir, 'modestbench.config.js');
      await access(configPath);

      // Verify file uses ESM, not CommonJS
      const content = await readFile(configPath, 'utf8');
      assert.ok(
        content.includes('export default'),
        'JS config should use ESM export default',
      );
      assert.ok(
        !content.includes('module.exports'),
        'JS config should not use CommonJS',
      );
    });

    it('should generate config loadable by cosmiconfig', async () => {
      await runCommand(
        ['init', '--config-type', 'js', '--no-examples'],
        tempDir,
      );

      const manager = new ModestBenchConfigurationManager();
      const configPath = join(tempDir, 'modestbench.config.js');
      const config = await manager.load(configPath);

      // Verify cosmiconfig successfully loaded and validated the config
      assert.ok(config.pattern);
      assert.ok(Array.isArray(config.reporters));
      assert.ok(typeof config.iterations === 'number');
    });
  });

  describe('TypeScript config generation', () => {
    it('should create valid TypeScript config file', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'ts', '--no-examples'],
        tempDir,
      );

      assert.strictEqual(result.exitCode, 0, `Init failed: ${result.stderr}`);

      // Verify file exists
      const configPath = join(tempDir, 'modestbench.config.ts');
      await access(configPath);

      // Verify file has TypeScript import and type annotation
      const content = await readFile(configPath, 'utf8');
      assert.ok(
        content.includes('import type { ModestBenchConfig }'),
        'TS config should have type import',
      );
      assert.ok(
        content.includes('const config: ModestBenchConfig'),
        'TS config should have type annotation',
      );
      assert.ok(
        content.includes('export default config'),
        'TS config should export config',
      );
    });

    it('should generate config loadable by cosmiconfig', async () => {
      await runCommand(
        ['init', '--config-type', 'ts', '--no-examples'],
        tempDir,
      );

      const manager = new ModestBenchConfigurationManager();
      const configPath = join(tempDir, 'modestbench.config.ts');
      const config = await manager.load(configPath);

      // Verify cosmiconfig successfully loaded and validated the config
      assert.ok(config.pattern);
      assert.ok(Array.isArray(config.reporters));
      assert.ok(typeof config.iterations === 'number');
    });
  });

  describe('Project type templates', () => {
    it('should generate basic project with minimal config', async () => {
      await runCommand(['init', 'basic', '--no-examples'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const config = await manager.load(
        join(tempDir, 'modestbench.config.json'),
      );

      // Basic project should have minimal iterations
      assert.strictEqual(config.iterations, 100);
      assert.strictEqual(config.reporters.length, 1);
      assert.ok(config.reporters.includes('human'));
    });

    it('should generate advanced project with full config', async () => {
      await runCommand(['init', 'advanced', '--no-examples'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const config = await manager.load(
        join(tempDir, 'modestbench.config.json'),
      );

      // Advanced project should have more iterations and multiple reporters
      assert.strictEqual(config.iterations, 1000);
      assert.ok(config.reporters.length >= 2);
      assert.ok(config.outputDir);
      assert.ok(typeof config.warmup === 'number');
    });

    it('should generate library project optimized for testing', async () => {
      await runCommand(['init', 'library', '--no-examples'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const config = await manager.load(
        join(tempDir, 'modestbench.config.json'),
      );

      // Library project should have high iterations and all reporters
      assert.strictEqual(config.iterations, 5000);
      assert.ok(config.reporters.length >= 3);
      assert.ok(config.reporters.includes('csv'));
    });
  });

  describe('Example benchmark generation', () => {
    it('should create example benchmarks when requested', async () => {
      await runCommand(['init', '--examples'], tempDir);

      // Verify example files exist
      await access(join(tempDir, 'benchmarks', 'example.bench.js'));
      await access(join(tempDir, 'benchmarks', 'array-methods.bench.js'));
      await access(join(tempDir, 'benchmarks', 'string-operations.bench.js'));
    });

    it('should not create examples when --no-examples is specified', async () => {
      await runCommand(['init', '--no-examples'], tempDir);

      // Benchmarks directory should exist but be empty
      const benchmarksDir = join(tempDir, 'benchmarks');
      await access(benchmarksDir); // Directory exists

      // Example files should not exist
      await assert.rejects(
        async () => await access(join(benchmarksDir, 'example.bench.js')),
        'Example file should not exist',
      );
    });

    it('should generate valid ESM benchmark files', async () => {
      await runCommand(['init', '--examples'], tempDir);

      const exampleContent = await readFile(
        join(tempDir, 'benchmarks', 'example.bench.js'),
        'utf8',
      );

      assert.ok(
        exampleContent.includes('export default'),
        'Benchmark should use ESM',
      );
      assert.ok(
        exampleContent.includes('benchmarks:'),
        'Benchmark should have benchmarks object',
      );
    });
  });

  describe('Additional files generation', () => {
    it('should create .gitignore file', async () => {
      await runCommand(['init', '--no-examples'], tempDir);

      const gitignorePath = join(tempDir, '.gitignore');
      await access(gitignorePath);

      const content = await readFile(gitignorePath, 'utf8');
      assert.ok(
        content.includes('benchmark-results/'),
        'Should ignore results directory',
      );
      assert.ok(
        content.includes('node_modules/'),
        'Should ignore node_modules',
      );
    });

    it('should create README.md file', async () => {
      await runCommand(['init', '--no-examples'], tempDir);

      const readmePath = join(tempDir, 'README.md');
      await access(readmePath);

      const content = await readFile(readmePath, 'utf8');
      assert.ok(
        content.includes('ModestBench'),
        'README should mention ModestBench',
      );
      assert.ok(
        content.includes('modestbench run'),
        'README should have usage examples',
      );
    });
  });

  describe('Force flag behavior', () => {
    it('should fail when reinitializing without --force', async () => {
      // First init
      const result1 = await runCommand(['init', '--no-examples'], tempDir);
      assert.strictEqual(result1.exitCode, 0);

      // Second init without force
      const result2 = await runCommand(['init', '--no-examples'], tempDir);
      assert.strictEqual(result2.exitCode, 1);
      assert.ok(
        result2.stderr.includes('already exist') ||
          result2.stdout.includes('already exist'),
        'Should indicate files already exist',
      );
    });

    it('should succeed when reinitializing with --force', async () => {
      // First init
      const result1 = await runCommand(['init', '--no-examples'], tempDir);
      assert.strictEqual(result1.exitCode, 0);

      // Second init with force
      const result2 = await runCommand(
        ['init', '--force', '--no-examples'],
        tempDir,
      );
      assert.strictEqual(result2.exitCode, 0);
    });
  });

  describe('Directory structure', () => {
    it('should create benchmarks directory for all project types', async () => {
      await runCommand(['init', 'basic', '--no-examples'], tempDir);
      await access(join(tempDir, 'benchmarks'));
    });

    it('should create multiple directories for advanced projects', async () => {
      await runCommand(['init', 'advanced', '--no-examples'], tempDir);

      await access(join(tempDir, 'benchmarks'));
      await access(join(tempDir, 'benchmark-results'));
    });

    it('should create nested directories for library projects', async () => {
      await runCommand(['init', 'library', '--no-examples'], tempDir);

      await access(join(tempDir, 'benchmarks'));
      await access(join(tempDir, 'benchmarks', 'suites'));
      await access(join(tempDir, 'benchmark-results'));
    });
  });
});
