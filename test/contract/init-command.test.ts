import { expect } from 'bupkis';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Contract tests for `modestbench init` command Reference:
 * contracts/cli-commands.md lines 64-82
 */

describe('modestbench init command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('CLI options', () => {
    it('should support --config-type option', async () => {
      const result = await runCommand(['init', '--help'], tempDir);
      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout.includes('--config-type'), 'to be truthy');
    });

    it('should support --examples option', async () => {
      const result = await runCommand(['init', '--help'], tempDir);
      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout.includes('--examples'), 'to be truthy');
    });

    it('should support --force option', async () => {
      const result = await runCommand(['init', '--help']);
      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout.includes('--force'), 'to be truthy');
    });
  });

  describe('config file formats', () => {
    it('should support json config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'json', '--no-examples'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);

      // Verify JSON file was created
      const configPath = join(tempDir, 'modestbench.config.json');
      await access(configPath);

      // Verify it's valid JSON
      const content = await readFile(configPath, 'utf8');
      const config = JSON.parse(content);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(config.pattern, 'to be truthy');
    });

    it('should support yaml config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'yaml', '--no-examples'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);

      // Verify YAML file was created
      const configPath = join(tempDir, 'modestbench.config.yaml');
      await access(configPath);

      // Verify it's valid YAML format (basic check)
      const content = await readFile(configPath, 'utf8');
      expect(content.includes('pattern:'), 'to be truthy');
      expect(!content.includes('\\n'), 'to be truthy');
    });

    it('should support js config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'js', '--no-examples'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);

      // Verify JS file was created
      const configPath = join(tempDir, 'modestbench.config.js');
      await access(configPath);

      // Verify it uses ESM syntax
      const content = await readFile(configPath, 'utf8');
      expect(content.includes('export default'), 'to be truthy');
      expect(!content.includes('module.exports'), 'to be truthy');
    });

    it('should support ts config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'ts', '--no-examples'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);

      // Verify TS file was created
      const configPath = join(tempDir, 'modestbench.config.ts');
      await access(configPath);

      // Verify it has TypeScript types
      const content = await readFile(configPath, 'utf8');
      expect(content.includes('import type'), 'to be truthy');
    });
  });

  describe('file generation', () => {
    it('should create modestbench.config.json by default', async () => {
      const result = await runCommand(['init', '--no-examples'], tempDir);
      expect(result.exitCode, 'to equal', 0);

      // Check if config file was created
      const configPath = join(tempDir, 'modestbench.config.json');
      await access(configPath);

      // Verify it's valid JSON
      const content = await readFile(configPath, 'utf8');
      JSON.parse(content); // Should not throw
    });

    it('should create example files when --examples is specified', async () => {
      const result = await runCommand(['init', '--examples'], tempDir);
      expect(result.exitCode, 'to equal', 0);

      // Check if example benchmark files were created
      await access(join(tempDir, 'benchmarks', 'example.bench.js'));
      await access(join(tempDir, 'benchmarks', 'array-methods.bench.js'));
      await access(join(tempDir, 'benchmarks', 'string-operations.bench.js'));

      // Verify example file uses ESM
      const content = await readFile(
        join(tempDir, 'benchmarks', 'example.bench.js'),
        'utf8',
      );
      expect(content.includes('export default'), 'to be truthy');
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for successful initialization', async () => {
      const result = await runCommand(['init', '--no-examples'], tempDir);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should exit with code 1 when project already initialized without --force', async () => {
      // First init
      const result1 = await runCommand(['init', '--no-examples'], tempDir);
      expect(result1.exitCode, 'to equal', 0);

      // Second init without force should fail
      const result2 = await runCommand(['init', '--no-examples'], tempDir);
      expect(result2.exitCode, 'to equal', 1);
    });

    it('should exit with code 0 when project already initialized with --force', async () => {
      // First init
      const result1 = await runCommand(['init', '--no-examples'], tempDir);
      expect(result1.exitCode, 'to equal', 0);

      // Second init with force should succeed
      const result2 = await runCommand(
        ['init', '--force', '--no-examples'],
        tempDir,
      );
      expect(result2.exitCode, 'to equal', 0);
    });
  });

  describe('generated config file names', () => {
    it('should create .json file for json config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'json', '--no-examples'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);

      // Verify modestbench.config.json was created
      await access(join(tempDir, 'modestbench.config.json'));
    });

    it('should create .yaml file for yaml config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'yaml', '--no-examples'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);

      // Verify modestbench.config.yaml was created
      await access(join(tempDir, 'modestbench.config.yaml'));
    });

    it('should create .js file for js config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'js', '--no-examples'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);

      // Verify modestbench.config.js was created
      await access(join(tempDir, 'modestbench.config.js'));
    });

    it('should create .ts file for ts config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'ts', '--no-examples'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);

      // Verify modestbench.config.ts was created
      await access(join(tempDir, 'modestbench.config.ts'));
    });
  });
});
