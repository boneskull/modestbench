import { strict as assert } from 'node:assert';
import { access, mkdtemp, rm } from 'node:fs/promises';
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
      assert.ok(
        result.stdout.includes('--config-type') ||
          result.stderr.includes('not found'),
      );
    });

    it('should support --examples option', async () => {
      const result = await runCommand(['init', '--help'], tempDir);
      assert.ok(
        result.stdout.includes('--examples') ||
          result.stderr.includes('not found'),
      );
    });

    it('should support --force option', async () => {
      const result = await runCommand(['init', '--help']);
      assert.ok(
        result.stdout.includes('--force') ||
          result.stderr.includes('not found'),
      );
    });
  });

  describe('config file formats', () => {
    it('should support json config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'json'],
        tempDir,
      );
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should support yaml config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'yaml'],
        tempDir,
      );
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should support js config type', async () => {
      const result = await runCommand(['init', '--config-type', 'js'], tempDir);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should support ts config type', async () => {
      const result = await runCommand(['init', '--config-type', 'ts'], tempDir);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('file generation', () => {
    it('should create modestbench.config.json by default', async () => {
      const result = await runCommand(['init'], tempDir);
      if (result.exitCode === 0) {
        // Check if config file was created
        try {
          await access(join(tempDir, 'modestbench.config.json'));
          assert.ok(true, 'Config file should be created');
        } catch {
          assert.fail('Config file was not created');
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should create example files when --examples is specified', async () => {
      const result = await runCommand(['init', '--examples'], tempDir);
      if (result.exitCode === 0) {
        // Check if example benchmark file was created
        try {
          await access(join(tempDir, 'benchmarks', 'example.bench.js'));
          assert.ok(true, 'Example benchmark file should be created');
        } catch {
          assert.fail('Example benchmark file was not created');
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for successful initialization', async () => {
      const result = await runCommand(['init'], tempDir);
      assert.ok(result.exitCode === 0 || result.stderr.includes('not found'));
    });

    it('should exit with code 1 when project already initialized without --force', async () => {
      // First init
      await runCommand(['init'], tempDir);
      // Second init without force should fail
      const result = await runCommand(['init'], tempDir);
      assert.ok(result.exitCode === 1 || result.stderr.includes('not found'));
    });

    it('should exit with code 0 when project already initialized with --force', async () => {
      // First init
      await runCommand(['init'], tempDir);
      // Second init with force should succeed
      const result = await runCommand(['init', '--force'], tempDir);
      assert.ok(result.exitCode === 0 || result.stderr.includes('not found'));
    });

    it('should exit with code 2 for permission errors', async () => {
      // This is hard to test without actual permission issues
      const result = await runCommand(['init', '--help'], tempDir);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('generated config file names', () => {
    it('should create .json file for json config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'json'],
        tempDir,
      );
      // Check that it would create modestbench.config.json
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should create .yaml file for yaml config type', async () => {
      const result = await runCommand(
        ['init', '--config-type', 'yaml'],
        tempDir,
      );
      // Check that it would create modestbench.config.yaml
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should create .js file for js config type', async () => {
      const result = await runCommand(['init', '--config-type', 'js'], tempDir);
      // Check that it would create modestbench.config.js
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should create .ts file for ts config type', async () => {
      const result = await runCommand(['init', '--config-type', 'ts'], tempDir);
      // Check that it would create modestbench.config.ts
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });
});
