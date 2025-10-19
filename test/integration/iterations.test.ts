/**
 * Integration tests for --iterations flag
 *
 * Verifies that --iterations flag actually controls the number of benchmark
 * iterations rather than just the time budget.
 */

import { expect } from 'bupkis';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

describe('Iterations Flag Integration Tests', () => {
  let testDir: string;
  let benchmarkFile: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'modestbench-iterations-test-'));

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

  describe('with --iterations flag', () => {
    it('should complete quickly with low iteration count despite high time budget', async () => {
      const startTime = Date.now();

      // Run with 5 iterations but 10 second time budget
      // Should complete in milliseconds, not 10 seconds
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--iterations',
          '5',
          '--time',
          '10000',
          '--quiet',
        ],
        testDir,
      );

      const duration = Date.now() - startTime;

      // Should complete in well under 1 second (being generous with 2s threshold)
      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should respect iteration count with low values', async () => {
      const startTime = Date.now();

      // Run with 10 iterations but 5 second time budget
      // Should complete in well under 1 second
      const result = await runCommand(
        ['run', benchmarkFile, '--iterations', '10', '--time', '5000'],
        testDir,
      );

      const duration = Date.now() - startTime;

      // Should complete quickly, not wait for full 5 second time budget
      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should use default iterations when flag not provided', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '--time', '100'],
        testDir,
      );

      // Should complete successfully with defaults
      expect(result.exitCode, 'to equal', 0);
      // With default iterations (100), should still use minimal time
      // and complete relatively quickly
      expect(result.stdout.length, 'to be greater than', 0);
    });

    it('should complete faster with fewer iterations', async () => {
      // Run with 3 iterations
      const startTime1 = Date.now();
      const result1 = await runCommand(
        [
          'run',
          benchmarkFile,
          '--iterations',
          '3',
          '--time',
          '10000',
          '--quiet',
        ],
        testDir,
      );
      const duration1 = Date.now() - startTime1;

      // Run with 100 iterations
      const startTime2 = Date.now();
      const result2 = await runCommand(
        [
          'run',
          benchmarkFile,
          '--iterations',
          '100',
          '--time',
          '10000',
          '--quiet',
        ],
        testDir,
      );
      const duration2 = Date.now() - startTime2;

      expect(result1.exitCode, 'to equal', 0);
      expect(result2.exitCode, 'to equal', 0);

      // 3 iterations should be significantly faster than 100
      // (though we can't be too strict due to warmup, process startup, etc)
      expect(duration1, 'to be less than', duration2);
    });
  });

  describe('with -i short flag', () => {
    it('should accept -i as alias for --iterations', async () => {
      const startTime = Date.now();

      const result = await runCommand(
        ['run', benchmarkFile, '-i', '5', '--time', '10000', '--quiet'],
        testDir,
      );

      const duration = Date.now() - startTime;

      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('interaction with --quiet flag', () => {
    it('should not affect iteration behavior when quiet is enabled', async () => {
      const startTime = Date.now();

      const result = await runCommand(
        ['run', benchmarkFile, '--iterations', '5', '--quiet'],
        testDir,
      );

      const duration = Date.now() - startTime;

      // Should still complete quickly with quiet mode
      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to be empty');
    });
  });
});
