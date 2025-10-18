/**
 * Integration tests for CLI execution with symlinked installations
 *
 * Tests that ModestBench CLI works correctly when installed via symlink (e.g.,
 * npm install ../modestbench), which is common in local development and
 * monorepo workflows.
 */

import { expect } from 'bupkis';
import { execFile } from 'node:child_process';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');
const distCliPath = join(projectRoot, 'dist/cli/index.js');

describe('CLI Symlink Installation', () => {
  let testDir: string;
  let nodeModulesDir: string;
  let symlinkPath: string;

  beforeEach(async () => {
    // Create temp directory structure simulating npm install ../modestbench
    testDir = join(
      tmpdir(),
      `modestbench-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    nodeModulesDir = join(testDir, 'node_modules', 'modestbench');
    symlinkPath = join(nodeModulesDir, 'dist', 'cli', 'index.js');

    // Create directory structure
    await mkdir(dirname(symlinkPath), { recursive: true });

    // Create symlink to the actual CLI file
    await symlink(distCliPath, symlinkPath, 'file');

    // Create a simple benchmark file for testing
    const benchmarkDir = join(testDir, 'benchmarks');
    await mkdir(benchmarkDir, { recursive: true });

    const benchmarkFile = join(benchmarkDir, 'test.bench.js');
    await writeFile(
      benchmarkFile,
      `
export default {
  suites: {
    'Test Suite': {
      benchmarks: {
        'simple test': {
          fn: () => {
            const x = 1 + 1;
            return x;
          }
        }
      }
    }
  }
};
`,
    );
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { force: true, recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should execute correctly when CLI is accessed via symlink', async () => {
    // Execute the CLI via the symlink with --version flag (quick test)
    const { stderr, stdout } = await execFileAsync(
      process.execPath,
      [symlinkPath, '--version'],
      {
        cwd: testDir,
        env: { ...process.env, NODE_ENV: 'test' },
      },
    );

    // Should output version without errors
    expect(stderr, 'to equal', '');
    expect(stdout, 'to match', /\d+\.\d+\.\d+/);
  });

  it('should show help when accessed via symlink', async () => {
    // Execute the CLI via the symlink with --help flag
    const { stderr, stdout } = await execFileAsync(
      process.execPath,
      [symlinkPath, '--help'],
      {
        cwd: testDir,
        env: { ...process.env, NODE_ENV: 'test' },
      },
    );

    // Should output help text
    expect(stderr, 'to equal', '');
    expect(stdout, 'to contain', 'Commands:');
    expect(stdout, 'to contain', 'run');
    expect(stdout, 'to contain', 'history');
    expect(stdout, 'to contain', 'init');
    expect(stdout, 'to contain', 'validate');
  });

  it('should run benchmarks when executed via symlink', async () => {
    // This is a longer-running test, so we increase timeout
    const benchmarkPattern = 'benchmarks/test.bench.js';

    try {
      const { stderr, stdout } = await execFileAsync(
        process.execPath,
        [symlinkPath, 'run', benchmarkPattern, '--iterations', '1', '--quiet'],
        {
          cwd: testDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 30000, // 30 second timeout
        },
      );

      // Should execute without errors and show benchmark results
      // Exact output may vary, but should indicate successful execution
      expect(stderr, 'to equal', '');
      // Should contain some indication of benchmark execution
      // (the exact format depends on the reporter)
      expect(stdout.length, 'to be greater than', 0);
    } catch (error: unknown) {
      // If execution fails, provide useful debug info
      if (
        error &&
        typeof error === 'object' &&
        'stdout' in error &&
        'stderr' in error
      ) {
        const execError = error as {
          message: string;
          stderr: string;
          stdout: string;
        };
        console.error('Benchmark execution failed:');
        console.error('stdout:', execError.stdout);
        console.error('stderr:', execError.stderr);
      }
      throw error;
    }
  });

  it('should handle missing arguments gracefully via symlink', async () => {
    // Execute CLI without required command (should show error)
    try {
      await execFileAsync(process.execPath, [symlinkPath], {
        cwd: testDir,
        env: { ...process.env, NODE_ENV: 'test' },
      });
      // Should not reach here - should throw
      throw new Error('Should have thrown an error for missing command');
    } catch (error: unknown) {
      // Expect exit code 2 (CONFIG_ERROR) for missing command
      if (error && typeof error === 'object' && 'code' in error) {
        const execError = error as { code: number; stderr: string };
        expect(execError.code, 'to equal', 2);
        expect(execError.stderr, 'to contain', 'You must specify a command');
      } else {
        throw error;
      }
    }
  });
});
