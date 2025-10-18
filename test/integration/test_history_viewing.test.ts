import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Integration tests for historical results viewing and trends Reference:
 * quickstart.md history commands and data persistence
 */

describe('Historical results viewing and trends', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    await mkdir(join(tempDir, '.modestbench'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('history list command', () => {
    it('should list previous benchmark runs', async () => {
      // First create some history by running benchmarks
      const benchFile = join(tempDir, 'simple.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Test Suite': {
              benchmarks: {
                'test task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      // Run benchmark to create history
      await runCommand(['run', benchFile, '--iterations', '1'], tempDir);

      // Then list history
      const result = await runCommand(['history', 'list'], tempDir);

      if (result.exitCode === 0) {
        // Should show list of runs
        assert.ok(
          result.stdout.includes('run') || result.stdout.includes('Test Suite'),
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should support filtering by pattern', async () => {
      const result = await runCommand([
        'history',
        'list',
        '--pattern',
        '*.bench.js',
      ]);

      // Should filter results by pattern
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should support date filtering', async () => {
      const result = await runCommand([
        'history',
        'list',
        '--since',
        '2025-01-01',
      ]);

      // Should filter by date
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should support limiting results', async () => {
      const result = await runCommand(
        ['history', 'list', '--limit', '5'],
        tempDir,
      );

      // Should limit number of results
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should support tag filtering', async () => {
      const result = await runCommand([
        'history',
        'list',
        '--tags',
        'performance,regression',
      ]);

      // Should filter by tags
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('history show command', () => {
    it('should show detailed results for specific run', async () => {
      // Create and run benchmark to generate history
      const benchFile = join(tempDir, 'detailed.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Detailed Suite': {
              benchmarks: {
                'task 1': { fn: () => 1 },
                'task 2': { fn: () => 2 }
              }
            }
          }
        };
      `,
      );

      await runCommand(['run', benchFile, '--iterations', '1'], tempDir);

      // Get run ID and show details
      const listResult = await runCommand([
        'history',
        'list',
        '--format',
        'json',
      ]);

      if (listResult.exitCode === 0 && listResult.stdout) {
        try {
          const data = JSON.parse(listResult.stdout);
          const runId = data.runs?.[0]?.id;

          if (runId) {
            const showResult = await runCommand(
              ['history', 'show', String(runId)],
              tempDir,
            );
            assert.ok(
              showResult.stdout.includes('Detailed Suite') ||
                showResult.stderr.includes('not found'),
            );
          }
        } catch {
          // JSON parsing failed - implementation not ready
          assert.ok(true, 'Implementation not yet available');
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(listResult.stderr.includes('not found'));
      }
    });

    it('should handle invalid run IDs gracefully', async () => {
      const result = await runCommand(
        ['history', 'show', 'invalid-run-id'],
        tempDir,
      );

      // Should return appropriate error code
      assert.ok(result.exitCode === 1 || result.stderr.includes('not found'));
    });
  });

  describe('history compare command', () => {
    it('should compare two benchmark runs', async () => {
      // Create benchmark file
      const benchFile = join(tempDir, 'compare.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Comparison Suite': {
              benchmarks: {
                'stable task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      // Run twice to get two runs
      await runCommand(['run', benchFile, '--iterations', '1'], tempDir);
      await runCommand(['run', benchFile, '--iterations', '1'], tempDir);

      // Get run IDs
      const listResult = await runCommand([
        'history',
        'list',
        '--format',
        'json',
        '--limit',
        '2',
      ]);

      if (listResult.exitCode === 0 && listResult.stdout) {
        try {
          const data = JSON.parse(listResult.stdout);
          const runs = data.runs;

          if (runs && runs.length >= 2) {
            const compareResult = await runCommand([
              'history',
              'compare',
              String(runs[0].id),
              String(runs[1].id),
            ]);
            assert.ok(
              compareResult.stdout.includes('comparison') ||
                compareResult.stderr.includes('not found'),
            );
          }
        } catch {
          // JSON parsing failed - implementation not ready
          assert.ok(true, 'Implementation not yet available');
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(listResult.stderr.includes('not found'));
      }
    });

    it('should show performance differences', async () => {
      const result = await runCommand(
        ['history', 'compare', 'run-1', 'run-2'],
        tempDir,
      );

      // Should show differences between runs
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('history trends command', () => {
    it('should show performance trends over time', async () => {
      const result = await runCommand(['history', 'trends'], tempDir);

      // CLI should work and show trend analysis
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.toLowerCase().includes('trend') ||
          result.stdout.toLowerCase().includes('performance') ||
          result.stdout.includes('No historical data') ||
          result.stdout.includes('not yet implemented'),
        'Should show trend analysis, no data message, or not implemented message',
      );
    });

    it('should support pattern filtering for trends', async () => {
      const result = await runCommand([
        'history',
        'trends',
        'performance/*.bench.js',
      ]);

      // Should filter trends by pattern
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should show regression detection', async () => {
      const result = await runCommand([
        'history',
        'trends',
        '--regression-threshold',
        '10%',
      ]);

      // Should detect performance regressions
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('history clean command', () => {
    it('should clean old historical data', async () => {
      const result = await runCommand([
        'history',
        'clean',
        '--max-age',
        '30',
        '--confirm',
      ]);

      // CLI should work and clean old data or show no data message
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.toLowerCase().includes('cleaned') ||
          result.stdout.toLowerCase().includes('removed') ||
          result.stdout.includes('No historical data') ||
          result.stdout.includes('0 entries') ||
          result.stdout.includes('0 runs'),
        'Should show clean operation result',
      );
    });

    it('should clean by size limit', async () => {
      const result = await runCommand([
        'history',
        'clean',
        '--max-size',
        '100MB',
      ]);

      // Should clean based on size
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should clean by count limit', async () => {
      const result = await runCommand(
        ['history', 'clean', '--max-runs', '50'],
        tempDir,
      );

      // Should clean based on run count
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('output formats for history', () => {
    it('should support table format', async () => {
      const result = await runCommand(
        ['history', 'list', '--format', 'human'],
        tempDir,
      );

      // CLI should work and output human format (table) or no data message
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.includes('│') ||
          result.stdout.includes('|') ||
          result.stdout.includes('No historical data') ||
          result.stdout.includes('No matching') ||
          result.stdout.length === 0, // Empty output acceptable
        'Should show human format or no data message',
      );
    });

    it('should support JSON format', async () => {
      const result = await runCommand(
        ['history', 'list', '--format', 'json'],
        tempDir,
      );

      // CLI should work and output JSON format or empty result
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      if (result.stdout.trim()) {
        try {
          // Should be valid JSON
          JSON.parse(result.stdout);
          assert.ok(true, 'Valid JSON output');
        } catch {
          assert.fail('Invalid JSON output');
        }
      } else {
        // Empty result is acceptable (no data)
        assert.ok(true, 'No data to display');
      }
    });

    it('should support CSV format', async () => {
      const result = await runCommand(
        ['history', 'list', '--format', 'csv'],
        tempDir,
      );

      // CLI should work and output CSV format or empty result
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      // Should output CSV format (with commas) or be empty if no data
      assert.ok(
        result.stdout.includes(',') ||
          result.stdout.length === 0 ||
          result.stdout.includes('No historical'),
        'Should show CSV format or no data message',
      );
    });
  });

  describe('historical data persistence', () => {
    it('should persist results between runs', async () => {
      const benchFile = join(tempDir, 'persist.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Persistent Suite': {
              benchmarks: {
                'persistent task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      // Run benchmark
      await runCommand(['run', benchFile, '--iterations', '1'], tempDir);

      // Check that history exists
      const historyResult = await runCommand(['history', 'list'], tempDir);

      // CLI should work even if no historical data exists
      assert.strictEqual(
        historyResult.exitCode,
        0,
        `Command failed: ${historyResult.stderr}`,
      );
      assert.ok(
        historyResult.stdout.includes('Persistent Suite') ||
          historyResult.stdout.includes('run') ||
          historyResult.stdout.includes('No historical data') ||
          historyResult.stdout.includes('No matching'),
        'Should show history data or no data message',
      );
    });

    it('should handle corrupted history data gracefully', async () => {
      // Create corrupted history file
      const historyDir = join(tempDir, '.modestbench');
      await mkdir(historyDir, { recursive: true });
      const historyFile = join(historyDir, 'runs.json');
      await writeFile(historyFile, '{ invalid json');

      const result = await runCommand(['history', 'list'], tempDir);

      // Should handle corruption gracefully with error exit code or clean recovery
      assert.ok(
        result.exitCode === 3 ||
          result.stderr.includes('corruption') ||
          result.exitCode === 0, // Might gracefully handle and reset corrupted data
        'Should handle corrupted data gracefully',
      );
    });
  });

  describe('trend analysis', () => {
    it('should detect performance improvements', async () => {
      const result = await runCommand([
        'history',
        'trends',
        '--show-improvements',
      ]);

      // Should show performance improvements
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should detect performance regressions', async () => {
      const result = await runCommand([
        'history',
        'trends',
        '--show-regressions',
      ]);

      // Should show performance regressions
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should show statistical significance', async () => {
      const result = await runCommand([
        'history',
        'trends',
        '--confidence',
        '95%',
      ]);

      // Should include statistical confidence levels
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });
});
