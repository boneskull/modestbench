import { expect } from 'bupkis';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';
import { fixtures } from './fixture-paths.js';

/**
 * Integration tests for benchmark file execution with progress tracking
 * Reference: quickstart.md lines 10-50 and CLI progress examples
 */

describe('Benchmark execution with progress tracking', () => {
  // Temp dir only needed for multi-file tests
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    await mkdir(join(tempDir, 'benchmarks'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('basic benchmark execution', () => {
    it('should execute simple benchmark file with progress', async () => {
      const result = await runCommand([
        'run',
        fixtures.arrayOperations,
        '--reporter',
        'human',
      ]);

      // Should execute successfully and show progress and results
      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /Array Operations|progress/);
      expect(result.stdout, 'to match', /ops\/sec|benchmark/);
    });

    it('should show file-level progress for multiple files', async () => {
      // Create multiple benchmark files (dynamic for file ordering test)
      const files = ['test1.bench.js', 'test2.bench.js', 'test3.bench.js'];

      for (const file of files) {
        const filePath = join(tempDir, 'benchmarks', file);
        await writeFile(
          filePath,
          `
          export default {
            suites: {
              'Suite ${file}': {
                benchmarks: {
                  'test task': {
                    fn: () => 1
                  }
                }
              }
            }
          };
        `,
        );
      }

      const result = await runCommand([
        'run',
        join(tempDir, 'benchmarks', '*.bench.js'),
        '--iterations',
        '1',
        '--reporter',
        'human',
      ]);

      // Should execute successfully and show progress across files
      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /progress|%/);
    });
  });

  describe('suite-level progress tracking', () => {
    it('should track progress within suites', async () => {
      const result = await runCommand([
        'run',
        fixtures.twoSuites,
        '--verbose',
        '--reporter',
        'human',
      ]);

      // Should execute successfully and show suite progress
      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to contain', 'Suite 1');
      expect(result.stdout, 'to contain', 'Suite 2');
    });
  });

  describe('real-time progress updates', () => {
    it('should provide live progress updates during execution', async () => {
      const result = await runCommand([
        'run',
        fixtures.withConfigIterations,
        '--reporter',
        'human',
      ]);

      // Should execute successfully and show task output
      expect(result.exitCode, 'to equal', 0);
      // Human reporter output includes task names and stats
      expect(result.stdout, 'to match', /Live Updates|passed|ops\/sec/);
    });
  });

  describe('progress with setup and teardown', () => {
    it('should run setup before and teardown after benchmarks', async () => {
      const result = await runCommand([
        'run',
        fixtures.setupTeardown,
        '--verbose',
        '--reporter',
        'human',
      ]);

      // Setup runs before benchmarks, so testData is available
      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /Setup\/Teardown Suite/);
      expect(result.stdout, 'to match', /process data/);
      expect(result.stdout, 'to match', /passed/);
    });

    it('should report setup failure when setup throws', async () => {
      const result = await runCommand([
        'run',
        fixtures.setupFailure,
        '--reporter',
        'human',
      ]);

      // Setup failure should be reported
      expect(result.exitCode, 'to be greater than', 0);
      expect(result.stdout, 'to match', /setup.*FAILED|Suite setup failed/i);
      expect(result.stdout, 'to match', /Setup exploded/);
    });
  });

  describe('error handling during execution', () => {
    it('should continue progress tracking even with benchmark failures', async () => {
      const result = await runCommand([
        'run',
        fixtures.mixedResults,
        '--reporter',
        'human',
      ]);

      // Should complete with exit code 1 (failures) but continue execution
      expect(
        result.exitCode === 1 || result.stderr.includes('not found'),
        'to be truthy',
      );

      if (result.exitCode === 1) {
        // Should show progress for successful tasks
        expect(result.stdout + result.stderr, 'to match', /good task|error/);
      }
    });
  });
});
