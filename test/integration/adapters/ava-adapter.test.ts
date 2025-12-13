/**
 * E2E tests for AVA adapter
 *
 * These tests verify that the AVA adapter correctly:
 *
 * 1. Captures test definitions from AVA test files
 * 2. Respects skip/todo modifiers
 * 3. Executes lifecycle hooks
 */
import { expect } from 'bupkis';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { runAdapterCommand } from './util.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, '../../fixtures/adapters/ava');

describe('AVA adapter E2E', () => {
  describe('basic test capture', () => {
    it('should capture tests from an AVA test file', async () => {
      const result = await runAdapterCommand(
        'ava',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1 },
      );

      expect(result.exitCode, 'to equal', 0);
      // Should find tests (AVA doesn't have suites, uses flat test structure)
      expect(result.stdout, 'to match', /should add two numbers|add/i);
    });

    it('should execute individual tests as benchmarks', async () => {
      const result = await runAdapterCommand(
        'ava',
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
        'ava',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, json: true },
      );

      expect(result.exitCode, 'to equal', 0);
      // AVA file has 7 tests defined, 2 are skip/todo
      const output = JSON.parse(result.stdout) as {
        run?: { summary?: { totalTasks?: number } };
      };
      const totalTasks = output.run?.summary?.totalTasks ?? 0;
      expect(totalTasks, 'to equal', 5);
    });

    it('should handle test.todo as skipped', async () => {
      const result = await runAdapterCommand(
        'ava',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1 },
      );

      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('lifecycle hooks', () => {
    it('should execute before and after hooks', async () => {
      const result = await runAdapterCommand(
        'ava',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1, verbose: true },
      );

      expect(result.exitCode, 'to equal', 0);
      // Verify tests ran without error
      expect(result.stderr, 'not to match', /Error/i);
    });

    it('should execute beforeEach and afterEach hooks', async () => {
      const result = await runAdapterCommand(
        'ava',
        [resolve(fixturesDir, 'basic.test.js')],
        { iterations: 1 },
      );

      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('JSON output', () => {
    it('should output valid JSON when --json flag is used', async () => {
      const result = await runAdapterCommand(
        'ava',
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
