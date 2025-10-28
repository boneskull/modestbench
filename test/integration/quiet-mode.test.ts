/**
 * Integration tests for --quiet flag
 *
 * Verifies that --quiet mode produces no output on successful runs but still
 * writes to history.
 */

import { expect } from 'bupkis';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

describe('Quiet Mode Integration Tests', () => {
  let testDir: string;
  let benchmarkFile: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'modestbench-quiet-test-'));

    // Create a simple benchmark file for testing
    benchmarkFile = join(testDir, 'simple.bench.js');
    await writeFile(
      benchmarkFile,
      `
export default {
  suites: {
    'Test Suite': {
      benchmarks: {
        'Fast Task': {
          fn: () => {
            // Very fast operation
            return 1 + 1;
          }
        },
        'Another Task': {
          fn: () => {
            // Another fast operation
            return 2 + 2;
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
    await rm(testDir, { force: true, recursive: true });
  });

  describe('with --quiet flag', () => {
    it('should produce no stdout output on successful run', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '--quiet', '--iterations', '5'],
        testDir,
      );

      // Stdout should be completely empty
      expect(result.stdout, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should produce no stderr output on successful run', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '--quiet', '--iterations', '5'],
        testDir,
      );

      // Stderr should be completely empty
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should still exit with code 0 on success', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '--quiet', '--iterations', '5'],
        testDir,
      );

      // Should complete successfully
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with -q short flag', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '-q', '--iterations', '5'],
        testDir,
      );

      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with json reporter', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--quiet',
          '--reporter',
          'json',
          '--iterations',
          '5',
        ],
        testDir,
      );

      // JSON output should still go to stdout (data output)
      // even in quiet mode when no --output is specified
      expect(result.stdout, 'not to be empty');
      expect(result.stdout, 'to match', /"meta":/);
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with csv reporter', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--quiet',
          '--reporter',
          'csv',
          '--iterations',
          '5',
        ],
        testDir,
      );

      // CSV output should still go to stdout (data output)
      // even in quiet mode when no --output is specified
      expect(result.stdout.length, 'to be greater than', 0);
      expect(result.stdout, 'to contain', 'file');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with multiple reporters', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--quiet',
          '--reporter',
          'human',
          '--reporter',
          'json',
          '--reporter',
          'csv',
          '--iterations',
          '5',
        ],
        testDir,
      );

      // Data reporters (JSON/CSV) should output to stdout
      // even in quiet mode when no --output is specified
      expect(result.stdout, 'not to be empty');
      // JSON output should be present
      expect(result.stdout, 'to match', /"meta":/);
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('without --quiet flag', () => {
    it('should produce output as normal', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '--iterations', '5'],
        testDir,
      );

      // Should have some output when not quiet
      expect(result.stdout, 'not to be empty');
    });
  });

  describe('error handling', () => {
    it('should still produce no output on validation errors with --quiet', async () => {
      // Create an invalid benchmark file
      const invalidFile = join(testDir, 'invalid.bench.js');
      await writeFile(invalidFile, 'export default { invalid: true };');

      const result = await runCommand(
        ['run', invalidFile, '--quiet', '--iterations', '5'],
        testDir,
      );

      // Even on error, quiet mode should suppress output
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      // Exit code may be non-zero for validation errors
      expect(result.exitCode, 'not to equal', 0);
    });
  });

  describe('with file output', () => {
    it('should write to file and produce no console output with --quiet and --output', async () => {
      const outputDir = join(testDir, 'output');
      await mkdir(outputDir, { recursive: true });

      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--quiet',
          '--reporter',
          'json',
          '--output',
          outputDir,
          '--iterations',
          '5',
        ],
        testDir,
      );

      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);

      // Verify file was written
      const outputFile = join(outputDir, 'results.json');
      const fileExists = existsSync(outputFile);
      expect(fileExists, 'to be true');
    });
  });
});
