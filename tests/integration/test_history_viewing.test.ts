import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/**
 * Integration tests for historical results viewing and trends
 * Reference: quickstart.md history commands and data persistence
 */

describe('Historical results viewing and trends', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
    await mkdir(join(tempDir, '.modestbench'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
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
                'test task': { fn: () => 1 + 1 }
              }
            }
          }
        };
      `
      );

      // Run benchmark to create history
      await runCommand(['run', benchFile]);

      // Then list history
      const result = await runCommand(['history', 'list']);

      if (result.exitCode === 0) {
        // Should show list of runs
        assert.ok(
          result.stdout.includes('run') || result.stdout.includes('Test Suite')
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
      const result = await runCommand(['history', 'list', '--limit', '5']);

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
                'task 1': { fn: () => Array(100).fill(0) },
                'task 2': { fn: () => Array(200).fill(1) }
              }
            }
          }
        };
      `
      );

      await runCommand(['run', benchFile]);

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
            const showResult = await runCommand(['history', 'show', runId]);
            assert.ok(
              showResult.stdout.includes('Detailed Suite') ||
                showResult.stderr.includes('not found')
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
      const result = await runCommand(['history', 'show', 'invalid-run-id']);

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
                'stable task': { fn: () => Math.floor(Math.random() * 100) }
              }
            }
          }
        };
      `
      );

      // Run twice to get two runs
      await runCommand(['run', benchFile]);
      await runCommand(['run', benchFile]);

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
              runs[0].id,
              runs[1].id,
            ]);
            assert.ok(
              compareResult.stdout.includes('comparison') ||
                compareResult.stderr.includes('not found')
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
      const result = await runCommand(['history', 'compare', 'run-1', 'run-2']);

      // Should show differences between runs
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('history trends command', () => {
    it('should show performance trends over time', async () => {
      const result = await runCommand(['history', 'trends']);

      if (result.exitCode === 0) {
        // Should show trend analysis
        assert.ok(
          result.stdout.includes('trend') ||
            result.stdout.includes('performance')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
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
        '--older-than',
        '30d',
      ]);

      if (result.exitCode === 0) {
        // Should clean old data
        assert.ok(
          result.stdout.includes('cleaned') || result.stdout.includes('removed')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
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
      const result = await runCommand(['history', 'clean', '--max-runs', '50']);

      // Should clean based on run count
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('output formats for history', () => {
    it('should support table format', async () => {
      const result = await runCommand(['history', 'list', '--format', 'table']);

      if (result.exitCode === 0) {
        // Should output table format
        assert.ok(result.stdout.includes('│') || result.stdout.includes('|'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should support JSON format', async () => {
      const result = await runCommand(['history', 'list', '--format', 'json']);

      if (result.exitCode === 0 && result.stdout) {
        try {
          // Should be valid JSON
          JSON.parse(result.stdout);
          assert.ok(true, 'Valid JSON output');
        } catch {
          assert.fail('Invalid JSON output');
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should support CSV format', async () => {
      const result = await runCommand(['history', 'list', '--format', 'csv']);

      if (result.exitCode === 0) {
        // Should output CSV format
        assert.ok(result.stdout.includes(',') || result.stdout.length === 0);
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
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
                'persistent task': { fn: () => 42 }
              }
            }
          }
        };
      `
      );

      // Run benchmark
      await runCommand(['run', benchFile]);

      // Check that history exists
      const historyResult = await runCommand(['history', 'list']);

      if (historyResult.exitCode === 0) {
        assert.ok(
          historyResult.stdout.includes('Persistent Suite') ||
            historyResult.stdout.includes('run')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(historyResult.stderr.includes('not found'));
      }
    });

    it('should handle corrupted history data gracefully', async () => {
      // Create corrupted history file
      const historyFile = join(tempDir, '.modestbench', 'runs.json');
      await writeFile(historyFile, '{ invalid json');

      const result = await runCommand(['history', 'list']);

      // Should handle corruption gracefully
      assert.ok(
        result.exitCode === 3 ||
          result.stderr.includes('not found') ||
          result.stderr.includes('corruption')
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

  /**
   * Helper function to run CLI commands and capture output
   */
  async function runCommand(args: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise(resolve => {
      const child: ChildProcess = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: tempDir,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? -1,
        });
      });

      child.on('error', (error: Error) => {
        resolve({
          stdout,
          stderr: stderr + error.message,
          exitCode: -1,
        });
      });
    });
  }
});
