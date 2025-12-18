/**
 * Integration tests for --quiet flag
 *
 * Verifies that --quiet mode produces no output on successful runs but still
 * writes to history.
 */

import { expect } from 'bupkis';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { findFileByPattern, runCommand } from '../util.js';
import { fixtures } from './fixture-paths.js';

describe('Quiet Mode Integration Tests', () => {
  // Temp dir needed for output file tests
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'modestbench-quiet-output-'));
  });

  afterEach(async () => {
    await rm(outputDir, { force: true, recursive: true });
  });

  describe('with --quiet flag', () => {
    it('should produce no stdout output on successful run', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--quiet',
        '--iterations',
        '5',
      ]);

      // Stdout should be completely empty
      expect(result.stdout, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should produce no stderr output on successful run', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--quiet',
        '--iterations',
        '5',
      ]);

      // Stderr should be completely empty
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should still exit with code 0 on success', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--quiet',
        '--iterations',
        '5',
      ]);

      // Should complete successfully
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with -q short flag', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '-q',
        '--iterations',
        '5',
      ]);

      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with json reporter and output to file', async () => {
      const outputFile = join(outputDir, 'results.json');
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--quiet',
        '--reporter',
        'json',
        '--output-file',
        outputFile,
        '--iterations',
        '5',
      ]);

      // Console should be quiet
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);

      // JSON file should be written
      const jsonContent = await readFile(outputFile, 'utf-8');
      expect(jsonContent, 'to match', /"meta":/);
    });

    it('should work with csv reporter and output to file', async () => {
      const outputFile = join(outputDir, 'results.csv');
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--quiet',
        '--reporter',
        'csv',
        '--output-file',
        outputFile,
        '--iterations',
        '5',
      ]);

      // Console should be quiet
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);

      // CSV file should be written
      const csvContent = await readFile(outputFile, 'utf-8');
      expect(csvContent, 'to contain', 'file');
    });

    it('should work with multiple reporters', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--quiet',
        '--reporter',
        'human',
        '--reporter',
        'json',
        '--reporter',
        'csv',
        '--output',
        outputDir,
        '--iterations',
        '5',
      ]);

      // Console should be quiet (human reporter suppressed in quiet mode)
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);

      // Both JSON and CSV files should be written with timestamped names
      const jsonFile = await findFileByPattern(
        outputDir,
        /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
      );
      expect(jsonFile, 'to be truthy');
      const jsonContent = await readFile(jsonFile!, 'utf-8');
      expect(jsonContent, 'to match', /"meta":/);

      const csvFile = await findFileByPattern(
        outputDir,
        /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/,
      );
      expect(csvFile, 'to be truthy');
      const csvContent = await readFile(csvFile!, 'utf-8');
      expect(csvContent, 'to contain', 'file');
    });
  });

  describe('without --quiet flag', () => {
    it('should produce output as normal', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--iterations',
        '5',
      ]);

      // Should have some output when not quiet
      expect(result.stdout, 'not to be empty');
    });
  });

  describe('error handling', () => {
    it('should still produce no output on validation errors with --quiet', async () => {
      const result = await runCommand([
        'run',
        fixtures.invalid,
        '--quiet',
        '--iterations',
        '5',
      ]);

      // Even on error, quiet mode should suppress output
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      // Exit code may be non-zero for validation errors
      expect(result.exitCode, 'not to equal', 0);
    });
  });

  describe('with file output', () => {
    it('should write to file and produce no console output with --quiet and --output', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--quiet',
        '--reporter',
        'json',
        '--output',
        outputDir,
        '--iterations',
        '5',
      ]);

      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);

      // Verify file was written with timestamped name
      const outputFile = await findFileByPattern(
        outputDir,
        /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
      );
      expect(outputFile, 'to be truthy');
      const fileExists = existsSync(outputFile!);
      expect(fileExists, 'to be true');
    });
  });
});
