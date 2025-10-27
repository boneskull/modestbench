import { expect } from 'bupkis';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Integration tests for baseline management commands
 */

describe('Baseline management commands', () => {
  let tempDir: string;
  let benchFile: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-baseline-test-'));
    await mkdir(join(tempDir, '.modestbench'), { recursive: true });

    // Create a simple benchmark file
    benchFile = join(tempDir, 'test.bench.js');
    await writeFile(
      benchFile,
      `
      export default {
        suites: {
          'Test Suite': {
            benchmarks: {
              'fast task': { fn: () => 1 + 1 },
              'slow task': { fn: () => { let x = 0; for (let i = 0; i < 1000; i++) x += i; return x; } }
            }
          }
        }
      };
    `,
    );
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('baseline set command', () => {
    it('should save most recent run as baseline', async () => {
      // Run benchmark to create history
      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);

      // Save as baseline
      const result = await runCommand(
        ['baseline', 'set', 'test-baseline'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /saved|test-baseline/i);
    });

    it('should accept --commit option', async () => {
      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);

      const result = await runCommand(
        [
          'baseline',
          'set',
          'test-baseline',
          '--commit',
          'abc123def456abc123def456abc123def456abc1',
        ],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
    });

    it('should accept --branch option', async () => {
      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);

      const result = await runCommand(
        ['baseline', 'set', 'test-baseline', '--branch', 'main'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
    });

    it('should accept --default flag', async () => {
      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);

      const result = await runCommand(
        ['baseline', 'set', 'test-baseline', '--default'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /default/i);
    });

    it('should accept --run-id option', async () => {
      const runResult = await runCommand(
        ['run', benchFile, '--iterations', '10'],
        tempDir,
      );

      // Extract run ID from output (format: "Run ID: abc1234")
      const runIdMatch = runResult.stdout.match(/Run ID:\s+(\w+)/i);

      if (runIdMatch) {
        const runId = runIdMatch[1];

        const result = await runCommand(
          ['baseline', 'set', 'test-baseline', '--run-id', runId!],
          tempDir,
        );

        expect(result.exitCode, 'to equal', 0);
      } else {
        // If run ID not found in output, command should still work with most recent
        const result = await runCommand(
          ['baseline', 'set', 'test-baseline'],
          tempDir,
        );
        expect(result.exitCode, 'to equal', 0);
      }
    });

    it('should fail when no runs exist', async () => {
      const result = await runCommand(
        ['baseline', 'set', 'test-baseline'],
        tempDir,
      );

      expect(result.exitCode, 'not to equal', 0);
      expect(result.stderr, 'to match', /no.*run/i);
    });
  });

  describe('baseline list command', () => {
    it('should list all baselines', async () => {
      // Create history and baselines
      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);
      await runCommand(['baseline', 'set', 'baseline1'], tempDir);

      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);
      await runCommand(['baseline', 'set', 'baseline2'], tempDir);

      const result = await runCommand(['baseline', 'list'], tempDir);

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /baseline1/);
      expect(result.stdout, 'to match', /baseline2/);
    });

    it('should show when no baselines exist', async () => {
      const result = await runCommand(['baseline', 'list'], tempDir);

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /no baseline/i);
    });

    it('should indicate default baseline', async () => {
      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);
      await runCommand(
        ['baseline', 'set', 'default-baseline', '--default'],
        tempDir,
      );

      const result = await runCommand(['baseline', 'list'], tempDir);

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /default/i);
    });
  });

  describe('baseline show command', () => {
    it('should show baseline details', async () => {
      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);
      await runCommand(['baseline', 'set', 'test-baseline'], tempDir);

      const result = await runCommand(
        ['baseline', 'show', 'test-baseline'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /test-baseline/);
      expect(result.stdout, 'to match', /fast task|slow task/);
    });

    it('should fail for non-existent baseline', async () => {
      const result = await runCommand(
        ['baseline', 'show', 'nonexistent'],
        tempDir,
      );

      expect(result.exitCode, 'not to equal', 0);
      expect(result.stderr, 'to match', /not found|nonexistent/i);
    });
  });

  describe('baseline delete command', () => {
    it('should delete a baseline', async () => {
      await runCommand(['run', benchFile, '--iterations', '10'], tempDir);
      await runCommand(['baseline', 'set', 'test-baseline'], tempDir);

      const result = await runCommand(
        ['baseline', 'delete', 'test-baseline'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /deleted|removed/i);

      // Verify it's gone
      const listResult = await runCommand(['baseline', 'list'], tempDir);
      expect(listResult.stdout, 'not to match', /test-baseline/);
    });

    it('should fail for non-existent baseline', async () => {
      const result = await runCommand(
        ['baseline', 'delete', 'nonexistent'],
        tempDir,
      );

      expect(result.exitCode, 'not to equal', 0);
      expect(result.stderr, 'to match', /not found|nonexistent/i);
    });
  });

  describe('baseline analyze command', () => {
    it('should analyze recent runs and suggest budgets', async () => {
      // Run benchmarks multiple times to create history
      for (let i = 0; i < 5; i++) {
        await runCommand(['run', benchFile, '--iterations', '10'], tempDir);
      }

      const result = await runCommand(['baseline', 'analyze'], tempDir);

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to match', /budget|suggest|analyze/i);
    });

    it('should accept --runs option', async () => {
      for (let i = 0; i < 3; i++) {
        await runCommand(['run', benchFile, '--iterations', '10'], tempDir);
      }

      const result = await runCommand(
        ['baseline', 'analyze', '--runs', '2'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
    });

    it('should accept --confidence option', async () => {
      for (let i = 0; i < 3; i++) {
        await runCommand(['run', benchFile, '--iterations', '10'], tempDir);
      }

      const result = await runCommand(
        ['baseline', 'analyze', '--confidence', '0.90'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
    });

    it('should fail when insufficient history exists', async () => {
      const result = await runCommand(['baseline', 'analyze'], tempDir);

      expect(result.exitCode, 'not to equal', 0);
      expect(result.stderr, 'to match', /insufficient|not enough|no run/i);
    });
  });
});
