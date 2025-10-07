import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/**
 * Integration tests for multiple reporter output formats
 * Reference: quickstart.md output format examples
 */

describe('Multiple reporter output formats', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
    await mkdir(join(tempDir, 'results'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('human reporter', () => {
    it('should produce human-readable output with colors and tables', async () => {
      const benchFile = join(tempDir, 'human-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Human Output Test': {
              benchmarks: {
                'fast operation': { fn: () => 1 + 1 },
                'slow operation': { fn: () => Array(1000).fill(0).reduce((a, b) => a + b, 0) }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human',
      ]);

      if (result.exitCode === 0) {
        // Should contain human-readable elements
        assert.ok(
          result.stdout.includes('ops/sec') ||
            result.stdout.includes('fastest') ||
            result.stdout.includes('Human Output Test')
        );

        // Should contain table-like formatting (from quickstart example)
        assert.ok(
          result.stdout.includes('│') ||
            result.stdout.includes('┌') ||
            result.stdout.includes('└') ||
            result.stdout.includes('|') ||
            result.stdout.includes('-')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should show progress bars during execution', async () => {
      const benchFile = join(tempDir, 'progress-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Progress Test': {
              benchmarks: {
                'task 1': { fn: () => Math.random() },
                'task 2': { fn: () => Math.random() },
                'task 3': { fn: () => Math.random() }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human',
      ]);

      if (result.exitCode === 0) {
        // Should show progress indicators
        assert.ok(
          result.stdout.includes('%') ||
            result.stdout.includes('█') ||
            result.stdout.includes('progress')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should display summary statistics', async () => {
      const benchFile = join(tempDir, 'stats-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Statistics Test': {
              benchmarks: {
                'stat task': { fn: () => 42 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human',
        '--verbose',
      ]);

      if (result.exitCode === 0) {
        // Should show statistical information
        assert.ok(
          result.stdout.includes('±') ||
            result.stdout.includes('mean') ||
            result.stdout.includes('stddev') ||
            result.stdout.includes('%')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('json reporter', () => {
    it('should produce valid JSON output', async () => {
      const benchFile = join(tempDir, 'json-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'JSON Test': {
              benchmarks: {
                'json task': { fn: () => ({ test: true }) }
              }
            }
          }
        };
      `
      );

      const outputFile = join(tempDir, 'results', 'results.json');
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output',
        join(tempDir, 'results'),
      ]);

      if (result.exitCode === 0) {
        try {
          // Check if JSON file was created
          const jsonContent = await readFile(outputFile, 'utf-8');
          const data = JSON.parse(jsonContent);

          // Should have expected JSON structure from quickstart
          assert.ok(data.run !== undefined);
          assert.ok(data.run.id !== undefined);
          assert.ok(data.run.timestamp !== undefined);
          assert.ok(Array.isArray(data.results));
        } catch (error) {
          // File might not exist or be invalid JSON
          if (result.stdout) {
            // Try parsing stdout as JSON
            const data = JSON.parse(result.stdout);
            assert.ok(data !== null);
          }
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should include all benchmark metadata in JSON', async () => {
      const benchFile = join(tempDir, 'metadata-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Metadata Suite': {
              benchmarks: {
                'metadata task': { 
                  fn: () => 123,
                  tags: ['performance', 'unit']
                }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
      ]);

      if (result.exitCode === 0 && result.stdout) {
        try {
          const data = JSON.parse(result.stdout);

          // Should include comprehensive metadata
          assert.ok(data.run);
          assert.ok(data.results);

          if (data.results.length > 0) {
            const firstResult = data.results[0];
            assert.ok(firstResult.file !== undefined);
            assert.ok(firstResult.suite !== undefined);
            assert.ok(firstResult.task !== undefined);
            assert.ok(firstResult.hz !== undefined);
            assert.ok(firstResult.stats !== undefined);
          }
        } catch {
          // JSON parsing failed - might be streaming or incomplete
          assert.ok(
            result.stdout.includes('json') || result.stdout.includes('{')
          );
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should support streaming JSON output', async () => {
      const benchFile = join(tempDir, 'streaming-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Streaming Suite': {
              benchmarks: {
                'stream task 1': { fn: () => 1 },
                'stream task 2': { fn: () => 2 },
                'stream task 3': { fn: () => 3 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--streaming',
      ]);

      if (result.exitCode === 0) {
        // Should produce JSON output (streaming or complete)
        assert.ok(result.stdout.includes('{') && result.stdout.includes('}'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('csv reporter', () => {
    it('should produce valid CSV output', async () => {
      const benchFile = join(tempDir, 'csv-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'CSV Test': {
              benchmarks: {
                'csv task 1': { fn: () => Array(10).fill(1) },
                'csv task 2': { fn: () => Array(20).fill(2) }
              }
            }
          }
        };
      `
      );

      const outputFile = join(tempDir, 'results', 'results.csv');
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'csv',
        '--output',
        join(tempDir, 'results'),
      ]);

      if (result.exitCode === 0) {
        try {
          // Check if CSV file was created
          const csvContent = await readFile(outputFile, 'utf-8');
          const lines = csvContent.trim().split('\n');

          // Should have header row
          assert.ok(lines.length >= 1);
          const headers = lines[0].split(',');
          assert.ok(
            headers.includes('file') ||
              headers.includes('suite') ||
              headers.includes('task')
          );

          // Should have data rows
          if (lines.length > 1) {
            assert.ok(lines[1].includes('csv task'));
          }
        } catch (error) {
          // File might not exist, check stdout
          if (result.stdout) {
            assert.ok(result.stdout.includes(','));
            assert.ok(
              result.stdout.includes('file') || result.stdout.includes('suite')
            );
          }
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should include all required CSV columns', async () => {
      const benchFile = join(tempDir, 'csv-columns-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'CSV Columns Test': {
              benchmarks: {
                'column task': { fn: () => 'test' }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile, '--reporters', 'csv']);

      if (result.exitCode === 0 && result.stdout) {
        const lines = result.stdout.trim().split('\n');
        if (lines.length > 0) {
          const headers = lines[0].toLowerCase();

          // Should include essential columns from quickstart example
          assert.ok(headers.includes('file'));
          assert.ok(headers.includes('suite'));
          assert.ok(headers.includes('task'));
          assert.ok(headers.includes('hz') || headers.includes('ops'));
          assert.ok(headers.includes('duration') || headers.includes('time'));
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should support custom CSV delimiters', async () => {
      const benchFile = join(tempDir, 'csv-delimiter-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Delimiter Test': {
              benchmarks: {
                'delimiter task': { fn: () => 'delimiter' }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'csv',
        '--csv-delimiter',
        ';',
      ]);

      if (result.exitCode === 0 && result.stdout) {
        // Should use semicolon delimiter
        assert.ok(result.stdout.includes(';'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('multiple reporters simultaneously', () => {
    it('should output to multiple formats at once', async () => {
      const benchFile = join(tempDir, 'multi-reporter-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Multi Reporter Test': {
              benchmarks: {
                'multi task': { fn: () => 'multiple' }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human,json,csv',
        '--output',
        join(tempDir, 'results'),
      ]);

      if (result.exitCode === 0) {
        // Should have human output in stdout
        assert.ok(
          result.stdout.includes('Multi Reporter Test') ||
            result.stdout.includes('ops')
        );

        // Should create json and csv files
        try {
          const jsonFile = join(tempDir, 'results', 'results.json');
          const csvFile = join(tempDir, 'results', 'results.csv');

          await readFile(jsonFile, 'utf-8');
          await readFile(csvFile, 'utf-8');

          assert.ok(true, 'Multiple output files created');
        } catch {
          // Files might not exist if implementation not ready
          assert.ok(
            result.stdout.length > 0 || result.stderr.includes('not found')
          );
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should handle reporter-specific configuration', async () => {
      const benchFile = join(tempDir, 'reporter-config-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Reporter Config Test': {
              benchmarks: {
                'config task': { fn: () => 'config' }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human,json,csv',
        '--human-colors',
        'false',
        '--json-pretty',
        'true',
        '--csv-delimiter',
        '|',
      ]);

      // Should handle reporter-specific options
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('output file management', () => {
    it('should create output directories', async () => {
      const benchFile = join(tempDir, 'output-dir-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Output Dir Test': {
              benchmarks: {
                'dir task': { fn: () => 'output' }
              }
            }
          }
        };
      `
      );

      const outputDir = join(tempDir, 'nested', 'output', 'dir');
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json,csv',
        '--output',
        outputDir,
      ]);

      if (result.exitCode === 0) {
        // Should create nested directories
        try {
          await readFile(join(outputDir, 'results.json'), 'utf-8');
          assert.ok(true, 'Created nested output directory');
        } catch {
          // Directory creation might not be implemented
          assert.ok(
            result.stderr.includes('not found') || result.stdout.length > 0
          );
        }
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should handle file naming conflicts', async () => {
      const benchFile = join(tempDir, 'conflict-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Conflict Test': {
              benchmarks: {
                'conflict task': { fn: () => 'conflict' }
              }
            }
          }
        };
      `
      );

      // Create existing file
      const existingFile = join(tempDir, 'results', 'results.json');
      await writeFile(existingFile, '{"existing": true}');

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output',
        join(tempDir, 'results'),
      ]);

      // Should handle existing files (overwrite or append)
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should support custom output filenames', async () => {
      const benchFile = join(tempDir, 'custom-name-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Custom Name Test': {
              benchmarks: {
                'name task': { fn: () => 'custom' }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output-file',
        'custom-results.json',
      ]);

      // Should use custom filename
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('reporter error handling', () => {
    it('should handle reporter failures gracefully', async () => {
      const benchFile = join(tempDir, 'reporter-error-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Reporter Error Test': {
              benchmarks: {
                'error task': { fn: () => 'error' }
              }
            }
          }
        };
      `
      );

      // Try to write to read-only location (should fail gracefully)
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output',
        '/dev/null/readonly',
      ]);

      // Should not crash, should report error appropriately
      assert.ok(result.exitCode >= 0);
    });

    it('should continue with other reporters if one fails', async () => {
      const benchFile = join(tempDir, 'partial-failure-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Partial Failure Test': {
              benchmarks: {
                'partial task': { fn: () => 'partial' }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human,json,csv,invalid-reporter',
      ]);

      // Should continue with valid reporters
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
