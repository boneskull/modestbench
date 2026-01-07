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

import { expect, expectAsync } from 'bupkis';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  DEFAULT_BENCHMARK_DIR,
  DEFAULT_OUTPUT_DIR,
} from '../../src/constants.js';
import { ModestBenchConfigurationManager } from '../../src/services/config-manager.js';
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
        ['init', '--config-type', 'json'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);

      // Verify file exists
      const configPath = join(tempDir, 'modestbench.config.json');
      await access(configPath); // Throws if file doesn't exist

      // Verify file content is valid JSON
      const content = await readFile(configPath, 'utf8');
      const config = JSON.parse(content);

      // Verify basic structure
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(config, 'to satisfy', {
        iterations: expect.it('to be a number'),
        pattern: expect.it('to be truthy'),
        reporters: expect.it('to be truthy'),
      });
    });

    it('should generate config loadable by cosmiconfig', async () => {
      await runCommand(['init', '--config-type', 'json'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const configPath = join(tempDir, 'modestbench.config.json');
      const config = await manager.load(configPath);

      // Verify cosmiconfig successfully loaded and validated the config
      expect(config, 'to satisfy', {
        iterations: expect.it('to be a number'),
        pattern: expect.it('to be truthy'),
        reporters: expect.it('to be an array'),
      });
    });
  });

  describe('YAML config generation', () => {
    it('should create valid YAML config file', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'yaml'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);

      // Verify file exists
      const configPath = join(tempDir, 'modestbench.config.yaml');
      await access(configPath);

      // Verify file content doesn't have escaped newlines
      const content = await readFile(configPath, 'utf8');
      expect(content, 'not to contain', '\\n', 'and', 'to contain', '\n');

      // Verify it has proper YAML structure
      expect(
        content,
        'to contain',
        'pattern:',
        'and',
        'to contain',
        'reporters:',
      );
    });

    it('should generate config loadable by cosmiconfig', async () => {
      await runCommand(['init', '--config-type', 'yaml'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const configPath = join(tempDir, 'modestbench.config.yaml');
      const config = await manager.load(configPath);

      // Verify cosmiconfig successfully loaded and validated the config
      expect(config, 'to satisfy', {
        iterations: expect.it('to be a number'),
        pattern: expect.it('to be truthy'),
        reporters: expect.it('to be an array'),
      });
    });

    it('should generate YAML with proper array formatting', async () => {
      await runCommand(['init', 'advanced', '--config-type', 'yaml'], tempDir);

      const content = await readFile(
        join(tempDir, 'modestbench.config.yaml'),
        'utf8',
      );

      // YAML arrays should use dash syntax
      expect(content, 'to contain', '  - ');
    });
  });

  describe('JavaScript config generation', () => {
    it('should create valid JavaScript config file', async () => {
      const result = await runCommand(['init', '--config-type', 'js'], tempDir);

      expect(result.exitCode, 'to equal', 0);

      // Verify file exists
      const configPath = join(tempDir, 'modestbench.config.js');
      await access(configPath);

      // Verify file uses ESM, not CommonJS
      const content = await readFile(configPath, 'utf8');
      expect(
        content,
        'to contain',
        'export default',
        'and',
        'not to contain',
        'module.exports',
      );
    });

    it('should generate config loadable by cosmiconfig', async () => {
      await runCommand(['init', '--config-type', 'js'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const configPath = join(tempDir, 'modestbench.config.js');
      const config = await manager.load(configPath);

      // Verify cosmiconfig successfully loaded and validated the config
      expect(config, 'to satisfy', {
        iterations: expect.it('to be a number'),
        pattern: expect.it('to be truthy'),
        reporters: expect.it('to be an array'),
      });
    });
  });

  describe('TypeScript config generation', () => {
    it('should create valid TypeScript config file', async () => {
      const result = await runCommand(['init', '--config-type', 'ts'], tempDir);

      expect(result.exitCode, 'to equal', 0);

      // Verify file exists
      const configPath = join(tempDir, 'modestbench.config.ts');
      await access(configPath);

      // Verify file has TypeScript import and type annotation
      const content = await readFile(configPath, 'utf8');
      expect(
        content,
        'to contain',
        'import type { ModestBenchConfig }',
        'and',
        'to contain',
        'const config: ModestBenchConfig',
        'and',
        'to contain',
        'export default config',
      );
    });

    it('should generate config loadable by cosmiconfig', async () => {
      await runCommand(['init', '--config-type', 'ts'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const configPath = join(tempDir, 'modestbench.config.ts');
      const config = await manager.load(configPath);

      // Verify cosmiconfig successfully loaded and validated the config
      expect(config, 'to satisfy', {
        iterations: expect.it('to be a number'),
        pattern: expect.it('to be truthy'),
        reporters: expect.it('to be an array'),
      });
    });
  });

  describe('Project type templates', () => {
    it('should generate basic project with minimal config', async () => {
      await runCommand(['init', 'basic'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const config = await manager.load(
        join(tempDir, 'modestbench.config.json'),
      );

      // Basic project should have minimal iterations
      expect(config, 'to satisfy', {
        iterations: 100,
        reporters: expect.it('to have length', 1),
      });
      expect(config.reporters, 'to contain', 'human');
    });

    it('should generate advanced project with full config', async () => {
      await runCommand(['init', 'advanced'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const config = await manager.load(
        join(tempDir, 'modestbench.config.json'),
      );

      // Advanced project should have more iterations and multiple reporters
      expect(config, 'to satisfy', {
        iterations: 1000,
        outputDir: expect.it('to be truthy'),
        warmup: expect.it('to be a number'),
      });
      expect(config.reporters.length, 'to be greater than or equal to', 2);
    });

    it('should generate library project optimized for testing', async () => {
      await runCommand(['init', 'library'], tempDir);

      const manager = new ModestBenchConfigurationManager();
      const config = await manager.load(
        join(tempDir, 'modestbench.config.json'),
      );

      // Library project should have high iterations and all reporters
      expect(config.iterations, 'to equal', 5000);
      expect(config.reporters.length, 'to be', 2);
      expect(config.reporters, 'not to contain', 'csv');
    });
  });

  describe('Example benchmark generation', () => {
    it('should create example benchmarks when requested', async () => {
      await runCommand(['init', '--examples'], tempDir);

      // Verify example files exist
      await access(join(tempDir, 'bench', 'example.bench.js'));
      await access(join(tempDir, 'bench', 'array-methods.bench.js'));
      await access(join(tempDir, 'bench', 'string-operations.bench.js'));
    });

    it('should not create examples by default (examples opt-in)', async () => {
      await runCommand(['init'], tempDir);

      // Bench directory should exist but be empty
      const benchmarksDir = join(tempDir, DEFAULT_BENCHMARK_DIR);
      await access(benchmarksDir); // Directory exists

      // Example files should not exist
      await expectAsync(
        access(join(benchmarksDir, 'example.bench.js')),
        'to reject',
      );
    });

    it('should generate valid ESM benchmark files', async () => {
      await runCommand(['init', '--examples'], tempDir);

      const exampleContent = await readFile(
        join(tempDir, DEFAULT_BENCHMARK_DIR, 'example.bench.js'),
        'utf8',
      );

      expect(
        exampleContent,
        'to contain',
        'export default',
        'and',
        'to contain',
        'benchmarks:',
      );
    });
  });

  describe('Additional files generation', () => {
    it('should create .gitignore file', async () => {
      await runCommand(['init'], tempDir);

      const gitignorePath = join(tempDir, '.gitignore');
      await access(gitignorePath);

      const content = await readFile(gitignorePath, 'utf8');
      expect(
        content,
        'to contain',
        `${DEFAULT_OUTPUT_DIR}/`,
        'and',
        'to contain',
        'node_modules/',
      );
    });

    it('should include .modestbench/ in new .gitignore', async () => {
      await runCommand(['init'], tempDir);

      const gitignorePath = join(tempDir, '.gitignore');
      const content = await readFile(gitignorePath, 'utf8');

      expect(content, 'to contain', `${DEFAULT_OUTPUT_DIR}/`);
    });

    it('should append .modestbench/ to existing .gitignore with --yes flag', async () => {
      const gitignorePath = join(tempDir, '.gitignore');

      // Create existing .gitignore without .modestbench/
      await writeFile(gitignorePath, 'node_modules/\n*.log\n', 'utf8');

      // Run init with --yes to auto-accept prompt
      await runCommand(['init', '--yes'], tempDir);

      const content = await readFile(gitignorePath, 'utf8');

      // Should contain original content
      expect(content, 'to contain', 'node_modules/');
      expect(content, 'to contain', '*.log');

      // Should contain newly added .modestbench/
      expect(content, 'to contain', `${DEFAULT_OUTPUT_DIR}/`);
      expect(content, 'to contain', '# ModestBench history');
    });

    it('should append .modestbench/ to existing .gitignore with --quiet flag', async () => {
      const gitignorePath = join(tempDir, '.gitignore');

      // Create existing .gitignore without .modestbench/
      await writeFile(gitignorePath, 'node_modules/\n', 'utf8');

      // Run init with --quiet to auto-accept prompt
      await runCommand(['init', '--quiet'], tempDir);

      const content = await readFile(gitignorePath, 'utf8');

      // Should contain newly added .modestbench/
      expect(content, 'to contain', `${DEFAULT_OUTPUT_DIR}/`);
    });

    it(`should not duplicate ${DEFAULT_OUTPUT_DIR}/ if already present`, async () => {
      const gitignorePath = join(tempDir, '.gitignore');

      // Create existing .gitignore with .modestbench/ already in it
      await writeFile(
        gitignorePath,
        'node_modules/\n${DEFAULT_OUTPUT_DIR}/\n*.log\n',
        'utf8',
      );

      // Run init with --yes
      await runCommand(['init', '--yes'], tempDir);

      const content = await readFile(gitignorePath, 'utf8');

      // Count occurrences of .modestbench/
      const matches = content.match(new RegExp(`${DEFAULT_OUTPUT_DIR}/`, 'g'));
      expect(matches?.length, 'to equal', 1);
    });

    it(`should format appended ${DEFAULT_OUTPUT_DIR}/ with proper newlines`, async () => {
      const gitignorePath = join(tempDir, '.gitignore');

      // Create existing .gitignore without trailing newline
      await writeFile(gitignorePath, 'node_modules/', 'utf8');

      // Run init with --yes
      await runCommand(['init', '--yes'], tempDir);

      const content = await readFile(gitignorePath, 'utf8');

      // Should have proper formatting
      expect(
        content,
        'to contain',
        `node_modules/\n\n# ModestBench history\n${DEFAULT_OUTPUT_DIR}/\n`,
      );
    });

    it('should create README.md file', async () => {
      await runCommand(['init'], tempDir);

      const readmePath = join(tempDir, 'README.md');
      await access(readmePath);

      const content = await readFile(readmePath, 'utf8');
      expect(
        content,
        'to contain',
        'ModestBench',
        'and',
        'to contain',
        'modestbench run',
      );
    });
  });

  describe('Force flag behavior', () => {
    it('should fail when reinitializing without --force', async () => {
      // First init
      const result1 = await runCommand(['init'], tempDir);
      expect(result1.exitCode, 'to equal', 0);

      // Second init without force
      const result2 = await runCommand(['init'], tempDir);
      expect(result2.exitCode, 'to equal', 1);
      expect(result2.stderr + result2.stdout, 'to match', /already exist/);
    });

    it('should succeed when reinitializing with --force', async () => {
      // First init
      const result1 = await runCommand(['init'], tempDir);
      expect(result1.exitCode, 'to equal', 0);

      // Second init with force
      const result2 = await runCommand(['init', '--force'], tempDir);
      expect(result2.exitCode, 'to equal', 0);
    });
  });

  describe('Directory structure', () => {
    it('should create bench directory for all project types', async () => {
      await runCommand(['init', 'basic'], tempDir);
      await access(join(tempDir, 'bench'));
    });

    it('should create multiple directories for advanced projects', async () => {
      await runCommand(['init', 'advanced'], tempDir);

      await access(join(tempDir, 'bench'));
      await access(join(tempDir, '.modestbench'));
    });

    it('should create nested directories for library projects', async () => {
      await runCommand(['init', 'library'], tempDir);

      await access(join(tempDir, 'bench'));
      await access(join(tempDir, 'bench', 'suites'));
      await access(join(tempDir, '.modestbench'));
    });
  });
});
