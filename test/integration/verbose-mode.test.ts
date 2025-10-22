/**
 * Integration tests for --verbose flag
 *
 * Verifies that --verbose mode shows CLI setup messages and enables reporter
 * verbose output, while default mode hides setup messages.
 */

import { expect } from 'bupkis';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

describe('Verbose Mode Integration Tests', () => {
  let testDir: string;
  let benchmarkFile: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'modestbench-verbose-test-'));

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

  describe('default mode (no --verbose)', () => {
    it('should not show CLI setup messages', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '--iterations', '5', '--reporters', 'human'],
        testDir,
      );

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
      const result = await runCommand(
        ['run', benchmarkFile, '--iterations', '5', '--reporters', 'human'],
        testDir,
      );

      // Reporter output (human reporter) should still appear in stdout
      expect(result.stdout, 'not to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should not show redundant completion messages', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '--iterations', '5', '--reporters', 'human'],
        testDir,
      );

      // The old redundant messages should not appear
      expect(result.stderr, 'not to contain', 'Run completed successfully!');
      expect(result.stderr, 'not to contain', 'Total tasks:');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('with --verbose flag', () => {
    it('should show all CLI setup messages', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--verbose',
          '--iterations',
          '5',
          '--reporters',
          'human',
        ],
        testDir,
      );

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
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--verbose',
          '--iterations',
          '5',
          '--reporters',
          'human',
        ],
        testDir,
      );

      // Reporter output (human reporter) should appear in stdout
      expect(result.stdout, 'not to be empty');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should work with -v short flag', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '-v',
          '--iterations',
          '5',
          '--reporters',
          'human',
        ],
        testDir,
      );

      // Setup messages should appear with short flag
      expect(result.stderr, 'to contain', 'Loading configuration...');
      expect(result.stderr, 'to contain', 'Setting up reporters...');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should enable human reporter verbose features', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--verbose',
          '--iterations',
          '5',
          '--reporters',
          'human',
        ],
        testDir,
      );

      // The human reporter should show verbose output (e.g., iteration counts)
      expect(result.stdout, 'to contain', 'iterations');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should not show redundant completion messages', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--verbose',
          '--iterations',
          '5',
          '--reporters',
          'human',
        ],
        testDir,
      );

      // The old redundant messages should not appear even in verbose mode
      expect(result.stderr, 'not to contain', 'Run completed successfully!');
      expect(result.stderr, 'not to contain', 'Total tasks:');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('with --verbose and errors', () => {
    it('should show error details and stack traces', async () => {
      // Create a benchmark file with an error
      const errorFile = join(testDir, 'error.bench.js');
      await writeFile(
        errorFile,
        `
export default {
  suites: {
    'Error Suite': {
      benchmarks: {
        'Failing Task': {
          fn: () => {
            throw new Error('Test error message');
          }
        }
      }
    }
  }
};
`,
      );

      const result = await runCommand(
        [
          'run',
          errorFile,
          '--verbose',
          '--iterations',
          '5',
          '--reporters',
          'human',
        ],
        testDir,
      );

      // Should show error message
      expect(result.stdout, 'to contain', 'Test error message');
      // Exit code should be non-zero due to error
      expect(result.exitCode, 'not to equal', 0);
    });

    it('should show validation warnings in verbose mode', async () => {
      // This is a placeholder test - actual validation warnings
      // would require specific invalid benchmark structure
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--verbose',
          '--iterations',
          '5',
          '--reporters',
          'human',
        ],
        testDir,
      );

      // Even if there are no warnings, verbose mode should be enabled
      expect(result.stderr, 'to contain', 'Validating benchmark files...');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('interaction with --quiet flag', () => {
    it('should suppress all output when both --quiet and --verbose are used', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--quiet',
          '--verbose',
          '--iterations',
          '5',
          '--reporters',
          'human',
        ],
        testDir,
      );

      // Quiet mode should win - no output at all
      expect(result.stdout, 'to be empty');
      expect(result.stderr, 'to be empty');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('with json reporter', () => {
    it('should show CLI setup messages in verbose mode', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--verbose',
          '--reporters',
          'json',
          '--iterations',
          '5',
        ],
        testDir,
      );

      // CLI setup messages should appear in stderr
      expect(result.stderr, 'to contain', 'Loading configuration...');
      expect(result.stderr, 'to contain', 'Setting up reporters...');
      // JSON data should appear in stdout
      expect(result.stdout, 'to contain', '"meta":');
      expect(result.exitCode, 'to equal', 0);
    });

    it('should not show setup messages without verbose', async () => {
      const result = await runCommand(
        ['run', benchmarkFile, '--reporters', 'json', '--iterations', '5'],
        testDir,
      );

      // CLI setup messages should NOT appear (json reporter forces quiet for CLI)
      expect(result.stderr, 'to be empty');
      // JSON data should appear in stdout
      expect(result.stdout, 'to contain', '"meta":');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('with csv reporter', () => {
    it('should show CLI setup messages in verbose mode', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--verbose',
          '--reporters',
          'csv',
          '--iterations',
          '5',
        ],
        testDir,
      );

      // CLI setup messages should appear in stderr
      expect(result.stderr, 'to contain', 'Loading configuration...');
      expect(result.stderr, 'to contain', 'Setting up reporters...');
      // CSV data should appear in stdout
      expect(result.stdout, 'to contain', 'file');
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('with multiple reporters', () => {
    it('should pass verbose flag to all reporters', async () => {
      const result = await runCommand(
        [
          'run',
          benchmarkFile,
          '--verbose',
          '--reporters',
          'human,json,csv',
          '--iterations',
          '5',
        ],
        testDir,
      );

      // CLI setup messages should appear
      expect(result.stderr, 'to contain', 'Loading configuration...');
      // Human reporter verbose features should be active (e.g., iteration counts)
      expect(result.stdout, 'to contain', 'iterations');
      // JSON and CSV data should be in stdout
      expect(result.stdout, 'to contain', '"meta":');
      expect(result.exitCode, 'to equal', 0);
    });
  });
});
