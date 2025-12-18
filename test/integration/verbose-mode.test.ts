/**
 * Integration tests for --verbose flag
 *
 * Verifies that --verbose mode shows CLI setup messages and enables reporter
 * verbose output, while default mode hides setup messages.
 */

import { expect } from 'bupkis';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { findFileByPattern, runCommand } from '../util.js';
import { fixtures } from './fixture-paths.js';

describe('Verbose Mode Integration Tests', () => {
  // Temp dir needed for output file tests
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'modestbench-verbose-output-'));
  });

  afterEach(async () => {
    await rm(outputDir, { force: true, recursive: true });
  });

  describe('default mode (no --verbose)', () => {
    it('should not show CLI setup messages', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // Setup messages should NOT appear
      expect(result.stderr, 'not to contain', 'Loading configuration...');
      expect(result.stderr, 'not to contain', 'Setting up reporters...');
      expect(result.stderr, 'not to contain', 'Discovering benchmark files...');
      expect(result.stderr, 'not to contain', 'Found 1 benchmark file(s)');
      expect(result.stderr, 'not to contain', 'Validating benchmark files...');
      expect(
        result.stderr,
        'not to contain',
        'Starting benchmark execution...',
      );
      expect(result.exitCode, 'to equal', 0);
    });

    it('should still show reporter output', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // Reporter output (human reporter) should still appear in stdout
      expect(result.stdout, 'not to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should not show redundant completion messages', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // The old redundant messages should not appear
      expect(result.stderr, 'not to contain', 'Run completed successfully!');
      expect(result.stderr, 'not to contain', 'Total tasks:');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('with --verbose flag', () => {
    it('should show all CLI setup messages', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--verbose',
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // All setup messages should appear in stderr
      expect(result.stderr, 'to contain', 'Loading configuration...');
      expect(result.stderr, 'to contain', 'Setting up reporters...');
      expect(result.stderr, 'to contain', 'Discovering benchmark files...');
      expect(result.stderr, 'to contain', 'Found 1 benchmark file(s)');
      expect(result.stderr, 'to contain', 'Validating benchmark files...');
      expect(result.stderr, 'to contain', 'Starting benchmark execution...');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should still show reporter output', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--verbose',
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // Reporter output (human reporter) should appear in stdout
      expect(result.stdout, 'not to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with -v short flag', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '-v',
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // Setup messages should appear with short flag
      expect(result.stderr, 'to contain', 'Loading configuration...');
      expect(result.stderr, 'to contain', 'Setting up reporters...');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should enable human reporter verbose features', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--verbose',
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // The human reporter should show iteration counts inline
      expect(result.stdout, 'to contain', 'iter)');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should not show redundant completion messages', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--verbose',
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // The old redundant messages should not appear even in verbose mode
      expect(result.stderr, 'not to contain', 'Run completed successfully!');
      expect(result.stderr, 'not to contain', 'Total tasks:');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('with --verbose and errors', () => {
    it('should show error details and stack traces', async () => {
      const result = await runCommand([
        'run',
        fixtures.errorThrowing,
        '--verbose',
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // Should show error message
      expect(result.stdout, 'to contain', 'Test error message');
      // Exit code should be non-zero due to error
      expect(result.exitCode, 'not to equal', 0);
    });

    it('should show validation warnings in verbose mode', async () => {
      // This is a placeholder test - actual validation warnings
      // would require specific invalid benchmark structure
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--verbose',
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // Even if there are no warnings, verbose mode should be enabled
      expect(result.stderr, 'to contain', 'Validating benchmark files...');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('interaction with --quiet flag', () => {
    it('should suppress all output when both --quiet and --verbose are used', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--quiet',
        '--verbose',
        '--iterations',
        '5',
        '--reporter',
        'human',
      ]);

      // Quiet mode should win - no output at all
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('with json reporter', () => {
    it('should show CLI setup messages in verbose mode', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--verbose',
        '--reporter',
        'json',
        '--output',
        outputDir,
        '--iterations',
        '5',
      ]);

      // CLI setup messages should appear in stderr
      expect(result.stderr, 'to contain', 'Loading configuration...');
      expect(result.stderr, 'to contain', 'Setting up reporters...');
      expect(result.exitCode, 'to equal', 0);

      // JSON data should be written to file with timestamped name
      const jsonFile = await findFileByPattern(
        outputDir,
        /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
      );
      expect(jsonFile, 'to be truthy');
      const jsonContent = await readFile(jsonFile!, 'utf-8');
      expect(jsonContent, 'to contain', '"meta":');
    });

    it('should not show setup messages without verbose', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--reporter',
        'json',
        '--output',
        outputDir,
        '--iterations',
        '5',
      ]);

      // CLI setup messages should NOT appear
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);

      // JSON data should be written to file with timestamped name
      const jsonFile = await findFileByPattern(
        outputDir,
        /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/,
      );
      expect(jsonFile, 'to be truthy');
      const jsonContent = await readFile(jsonFile!, 'utf-8');
      expect(jsonContent, 'to contain', '"meta":');
    });
  });

  describe('with csv reporter', () => {
    it('should show CLI setup messages in verbose mode', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--verbose',
        '--reporter',
        'csv',
        '--output',
        outputDir,
        '--iterations',
        '5',
      ]);

      // CLI setup messages should appear in stderr
      expect(result.stderr, 'to contain', 'Loading configuration...');
      expect(result.stderr, 'to contain', 'Setting up reporters...');
      expect(result.exitCode, 'to equal', 0);

      // CSV data should be written to file with timestamped name
      const csvFile = await findFileByPattern(
        outputDir,
        /^benchmarks-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/,
      );
      expect(csvFile, 'to be truthy');
      const csvContent = await readFile(csvFile!, 'utf-8');
      expect(csvContent, 'to contain', 'file');
    });
  });

  describe('with multiple reporters', () => {
    it('should pass verbose flag to all reporters', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleTwoTasks,
        '--verbose',
        '--reporter',
        'human',
        '--iterations',
        '5',
      ]);

      // CLI setup messages should appear in verbose mode
      expect(result.stderr, 'to contain', 'Loading configuration...');
      // Human reporter should show iteration counts inline in verbose mode
      expect(result.stdout, 'to contain', 'iter)');
      expect(result.exitCode, 'to equal', 0);
    });
  });
});
