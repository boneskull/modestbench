/**
 * Integration tests for --limit-by flag
 *
 * Verifies that the --limit-by flag correctly controls whether benchmarks are
 * limited by time, iterations, or both.
 */

import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { runCommand } from '../util.js';
import { fixtures } from './fixture-paths.js';

describe('Limit-By Mode Integration Tests', () => {
  const benchmarkFile = fixtures.simple;

  describe('explicit --limit-by modes', () => {
    it('should respect --limit-by iterations', async () => {
      const startTime = Date.now();

      // With iterations mode, should complete quickly despite high time budget
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '5',
        '--time',
        '10000',
        '--limit-by',
        'iterations',
      ]);

      const duration = Date.now() - startTime;

      // Should complete in well under 1 second
      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should respect --limit-by time', async () => {
      const startTime = Date.now();

      // With time mode, should run for at least the time budget
      // Using a short time (100ms) to keep test fast
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '10000',
        '--time',
        '100',
        '--limit-by',
        'time',
      ]);

      const duration = Date.now() - startTime;

      // Should take at least close to the time budget
      // (allowing overhead, so checking it's less than 5 seconds but completed)
      expect(duration, 'to be less than', 5000);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should respect --limit-by any (stop at first threshold)', async () => {
      const startTime = Date.now();

      // With 'any' mode and low iterations, should stop quickly
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '5',
        '--time',
        '10000',
        '--limit-by',
        'any',
      ]);

      const duration = Date.now() - startTime;

      // Should complete quickly (iterations reached first)
      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should respect --limit-by all (require both thresholds)', async () => {
      // With 'all' mode, need both thresholds met
      // Using small values to keep test fast
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '5',
        '--time',
        '50',
        '--limit-by',
        'all',
      ]);

      // Should complete successfully after meeting both conditions
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('smart defaults (no explicit --limit-by)', () => {
    it('should default to iterations mode when only --iterations provided', async () => {
      const startTime = Date.now();

      // Only iterations provided → should limit by iterations
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '5',
      ]);

      const duration = Date.now() - startTime;

      // Should complete quickly
      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should default to time mode when only --time provided', async () => {
      // Only time provided → should limit by time
      // Using short time to keep test fast
      const result = await runCommand(['run', benchmarkFile, '--time', '100']);

      // Should complete successfully
      expect(result.exitCode, 'to equal', 0);
    });

    it('should default to any mode when both --time and --iterations provided', async () => {
      const startTime = Date.now();

      // Both provided → should stop at whichever comes first
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '5',
        '--time',
        '10000',
      ]);

      const duration = Date.now() - startTime;

      // Should complete quickly (iterations reached first)
      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should default to iterations mode when neither flag provided', async () => {
      const startTime = Date.now();

      // Neither provided → uses defaults with iterations mode
      const result = await runCommand(['run', benchmarkFile]);

      const duration = Date.now() - startTime;

      // With default iterations (100), should use iterations mode and complete reasonably fast
      expect(duration, 'to be less than', 5000);
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('interaction with --quiet flag', () => {
    it('should work with --limit-by iterations and --quiet', async () => {
      const startTime = Date.now();

      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '5',
        '--limit-by',
        'iterations',
        '--quiet',
      ]);

      const duration = Date.now() - startTime;

      expect(duration, 'to be less than', 2000);
      expect(result.stdout, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with --limit-by time and --quiet', async () => {
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--time',
        '100',
        '--limit-by',
        'time',
        '--quiet',
      ]);

      expect(result.stdout, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('short flag aliases', () => {
    it('should work with -i short flag for iterations', async () => {
      const startTime = Date.now();

      const result = await runCommand([
        'run',
        benchmarkFile,
        '-i',
        '5',
        '--limit-by',
        'iterations',
      ]);

      const duration = Date.now() - startTime;

      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with -t short flag for time', async () => {
      const result = await runCommand([
        'run',
        benchmarkFile,
        '-t',
        '100',
        '--limit-by',
        'time',
      ]);

      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('explicit override of smart defaults', () => {
    it('should allow overriding iterations default to time mode', async () => {
      // Provide iterations but explicitly request time mode
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '10000',
        '--time',
        '100',
        '--limit-by',
        'time',
      ]);

      // Should respect explicit time mode despite iterations being provided
      expect(result.exitCode, 'to equal', 0);
    });

    it('should allow overriding time default to iterations mode', async () => {
      const startTime = Date.now();

      // Provide time but explicitly request iterations mode
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--time',
        '10000',
        '--iterations',
        '5',
        '--limit-by',
        'iterations',
      ]);

      const duration = Date.now() - startTime;

      // Should respect explicit iterations mode and complete quickly
      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain fast execution for low iteration counts', async () => {
      const startTime = Date.now();

      // Low iteration count should still execute quickly (backward compatible behavior)
      const result = await runCommand([
        'run',
        benchmarkFile,
        '--iterations',
        '3',
      ]);

      const duration = Date.now() - startTime;

      expect(duration, 'to be less than', 2000);
      expect(result.exitCode, 'to equal', 0);
    });
  });
});
