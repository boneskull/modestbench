/**
 * E2E tests for Mocha adapter
 *
 * These tests verify that the Mocha adapter correctly:
 *
 * 1. Captures test definitions from Mocha test files using global injection
 * 2. Handles nested describe blocks
 * 3. Respects skip modifiers
 * 4. Executes lifecycle hooks
 */
import { expect } from 'bupkis';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { runAdapterCommand } from './util.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, '../../fixtures/adapters/mocha');

describe('Mocha adapter E2E', () => {
  describe('basic test capture', () => {
    it('should capture tests from a Mocha test file', async () => {
      const result = await runAdapterCommand(
        'mocha',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1 },
      );

      expect(result.exitCode, 'to equal', 0);
      // Should find the test suites
      expect(result.stdout, 'to contain', 'Math operations');
      expect(result.stdout, 'to contain', 'String operations');
    });

    it('should capture nested describe blocks', async () => {
      const result = await runAdapterCommand(
        'mocha',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, verbose: true },
      );

      expect(result.exitCode, 'to equal', 0);
      // Should find nested suite
      expect(result.stdout, 'to match', /multiplication/);
    });

    it('should execute individual tests as benchmarks', async () => {
      const result = await runAdapterCommand(
        'mocha',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 10 },
      );

      expect(result.exitCode, 'to equal', 0);
      // Should show ops/sec or timing info
      expect(result.stdout, 'to match', /ops\/sec|ns|ms/);
    });
  });

  describe('test modifiers', () => {
    it('should skip tests marked with it.skip', async () => {
      const result = await runAdapterCommand(
        'mocha',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, json: true },
      );

      expect(result.exitCode, 'to equal', 0);
      // 6 tests defined, 1 is skipped (handle negative numbers), so 5 should run
      const output = JSON.parse(result.stdout) as {
        run?: { summary?: { totalTasks?: number } };
      };
      const totalTasks = output.run?.summary?.totalTasks ?? 0;
      expect(totalTasks, 'to equal', 5);
    });
  });

  describe('lifecycle hooks', () => {
    it('should execute before and after hooks', async () => {
      const result = await runAdapterCommand(
        'mocha',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, verbose: true },
      );

      expect(result.exitCode, 'to equal', 0);
      expect(result.stderr, 'not to match', /Error/i);
    });

    it('should execute beforeEach and afterEach hooks', async () => {
      const result = await runAdapterCommand(
        'mocha',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1 },
      );

      expect(result.exitCode, 'to equal', 0);
      // String operations tests rely on beforeEach to set testString
      expect(result.stdout, 'to contain', 'String operations');
    });
  });

  describe('JSON output', () => {
    it('should output valid JSON when --json flag is used', async () => {
      const result = await runAdapterCommand(
        'mocha',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, json: true },
      );

      expect(result.exitCode, 'to equal', 0);
      const output = JSON.parse(result.stdout) as {
        run?: { files?: unknown; summary?: unknown };
      };
      expect(output, 'to have key', 'run');
      expect(output.run, 'to have key', 'files');
      expect(output.run, 'to have key', 'summary');
    });
  });
});
