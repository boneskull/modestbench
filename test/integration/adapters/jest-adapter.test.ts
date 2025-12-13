/**
 * E2E tests for Jest adapter
 *
 * These tests verify that the Jest adapter correctly:
 *
 * 1. Captures test definitions from Jest test files
 * 2. Handles nested describe blocks
 * 3. Respects skip/todo modifiers
 * 4. Executes lifecycle hooks
 */
import { expect } from 'bupkis';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { runAdapterCommand } from './util.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, '../../fixtures/adapters/jest');

describe('Jest adapter E2E', () => {
  describe('basic test capture', () => {
    it('should capture tests from a Jest test file', async () => {
      const result = await runAdapterCommand(
        'jest',
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
        'jest',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, verbose: true },
      );

      expect(result.exitCode, 'to equal', 0);
      // Should find nested suite
      expect(result.stdout, 'to match', /multiplication/);
    });

    it('should execute individual tests as benchmarks', async () => {
      const result = await runAdapterCommand(
        'jest',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 10 },
      );

      expect(result.exitCode, 'to equal', 0);
      // Should show ops/sec or timing info
      expect(result.stdout, 'to match', /ops\/sec|ns|ms/);
    });
  });

  describe('test modifiers', () => {
    it('should skip tests marked with test.skip', async () => {
      const result = await runAdapterCommand(
        'jest',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, json: true },
      );

      expect(result.exitCode, 'to equal', 0);
      // The skipped test should not appear in results (or be marked as skipped)
      // Count tasks in output - should be 5 (not 7 - skipping 1 skip and 1 todo)
      const output = JSON.parse(result.stdout) as {
        run?: { summary?: { totalTasks?: number } };
      };
      const totalTasks = output.run?.summary?.totalTasks ?? 0;
      // 7 tests defined, but 2 are skip/todo, so 5 should run
      expect(totalTasks, 'to equal', 5);
    });

    it('should handle test.todo as skipped', async () => {
      const result = await runAdapterCommand(
        'jest',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1 },
      );

      expect(result.exitCode, 'to equal', 0);
      // Todo test should not cause failures
    });
  });

  describe('lifecycle hooks', () => {
    it('should execute beforeAll and afterAll hooks', async () => {
      const result = await runAdapterCommand(
        'jest',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, verbose: true },
      );

      expect(result.exitCode, 'to equal', 0);
      // The hooks set up console output - verify tests ran without error
      expect(result.stderr, 'not to match', /Error/i);
    });

    it('should execute beforeEach and afterEach hooks', async () => {
      const result = await runAdapterCommand(
        'jest',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1 },
      );

      expect(result.exitCode, 'to equal', 0);
      // The String operations tests rely on beforeEach to set testString
      // If hooks didn't run, the tests would fail
      expect(result.stdout, 'to contain', 'String operations');
    });
  });

  describe('JSON output', () => {
    it('should output valid JSON when --json flag is used', async () => {
      const result = await runAdapterCommand(
        'jest',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, json: true },
      );

      expect(result.exitCode, 'to equal', 0);
      // Should be valid JSON with standard modestbench structure
      const output = JSON.parse(result.stdout) as {
        run?: { files?: unknown; summary?: unknown };
      };
      expect(output, 'to have key', 'run');
      expect(output.run, 'to have key', 'files');
      expect(output.run, 'to have key', 'summary');
    });
  });
});
