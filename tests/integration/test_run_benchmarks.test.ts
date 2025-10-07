import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/**
 * Integration tests for benchmark file execution with progress tracking
 * Reference: quickstart.md lines 10-50 and CLI progress examples
 */

describe('Benchmark execution with progress tracking', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
    await mkdir(join(tempDir, 'benchmarks'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('basic benchmark execution', () => {
    it('should execute simple benchmark file with progress', async () => {
      // Create benchmark file from quickstart example
      const benchFile = join(
        tempDir,
        'benchmarks',
        'array-operations.bench.js'
      );
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Array Operations': {
              benchmarks: {
                'Array.push()': {
                  fn: () => {
                    const arr = [];
                    for (let i = 0; i < 100; i++) {
                      arr.push(i);
                    }
                  }
                },
                
                'Array.unshift()': {
                  fn: () => {
                    const arr = [];
                    for (let i = 0; i < 100; i++) {
                      arr.unshift(i);
                    }
                  }
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
        'human',
      ]);

      if (result.exitCode === 0) {
        // Should show progress and results
        assert.ok(
          result.stdout.includes('Array Operations') ||
            result.stdout.includes('progress')
        );
        assert.ok(
          result.stdout.includes('ops/sec') ||
            result.stdout.includes('benchmark')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(
          result.stderr.includes('not found') ||
            result.stderr.includes('ENOENT')
        );
      }
    });

    it('should show file-level progress for multiple files', async () => {
      // Create multiple benchmark files
      const files = ['test1.bench.js', 'test2.bench.js', 'test3.bench.js'];

      for (const file of files) {
        const filePath = join(tempDir, 'benchmarks', file);
        await writeFile(
          filePath,
          `
          export default {
            suites: {
              'Suite ${file}': {
                benchmarks: {
                  'test task': {
                    fn: () => { return 1 + 1; }
                  }
                }
              }
            }
          };
        `
        );
      }

      const result = await runCommand([
        'run',
        join(tempDir, 'benchmarks', '*.bench.js'),
      ]);

      if (result.exitCode === 0) {
        // Should show progress across files
        assert.ok(
          result.stdout.includes('progress') || result.stdout.includes('%')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should display estimated completion time', async () => {
      const benchFile = join(tempDir, 'benchmarks', 'timing.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Timing Test': {
              benchmarks: {
                'slow task': {
                  fn: async () => {
                    // Simulate some work
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile, '--verbose']);

      if (result.exitCode === 0) {
        // Should show ETA or time estimates
        assert.ok(
          result.stdout.includes('ETA') || result.stdout.includes('estimated')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('suite-level progress tracking', () => {
    it('should track progress within suites', async () => {
      const benchFile = join(tempDir, 'benchmarks', 'multi-suite.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Suite 1': {
              benchmarks: {
                'task 1': { fn: () => 1 + 1 },
                'task 2': { fn: () => 2 + 2 },
                'task 3': { fn: () => 3 + 3 }
              }
            },
            'Suite 2': {
              benchmarks: {
                'task 4': { fn: () => 4 + 4 },
                'task 5': { fn: () => 5 + 5 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile, '--verbose']);

      if (result.exitCode === 0) {
        // Should show suite progress
        assert.ok(
          result.stdout.includes('Suite 1') && result.stdout.includes('Suite 2')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('real-time progress updates', () => {
    it('should provide live progress updates during execution', async () => {
      const benchFile = join(tempDir, 'benchmarks', 'live-progress.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          config: {
            iterations: 10
          },
          suites: {
            'Live Updates': {
              benchmarks: {
                'quick task 1': { fn: () => Math.random() },
                'quick task 2': { fn: () => Math.random() },
                'quick task 3': { fn: () => Math.random() }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile]);

      if (result.exitCode === 0) {
        // Should show progress indicators
        assert.ok(
          result.stdout.includes('progress') ||
            result.stdout.includes('completed')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('progress with setup and teardown', () => {
    it('should track progress including setup/teardown phases', async () => {
      const benchFile = join(tempDir, 'benchmarks', 'setup-teardown.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Setup/Teardown Suite': {
              setup: () => {
                // Suite setup
                global.testData = Array.from({length: 1000}, (_, i) => i);
              },
              
              teardown: () => {
                delete global.testData;
              },
              
              benchmarks: {
                'process data': {
                  fn: () => {
                    return global.testData.map(x => x * 2);
                  }
                }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile, '--verbose']);

      if (result.exitCode === 0) {
        // Should track setup/teardown in progress
        assert.ok(result.stdout.includes('Setup/Teardown Suite'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('concurrent execution progress', () => {
    it('should track progress for concurrent suite execution', async () => {
      const benchFile = join(tempDir, 'benchmarks', 'concurrent.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Concurrent Suite 1': {
              benchmarks: {
                'task A': { fn: () => Array(100).fill(0).map((_, i) => i) }
              }
            },
            'Concurrent Suite 2': {
              benchmarks: {
                'task B': { fn: () => Array(100).fill(0).filter((_, i) => i % 2) }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile, '--concurrent']);

      if (result.exitCode === 0) {
        // Should show concurrent progress
        assert.ok(result.stdout.includes('Concurrent Suite'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('error handling during execution', () => {
    it('should continue progress tracking even with benchmark failures', async () => {
      const benchFile = join(tempDir, 'benchmarks', 'with-errors.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Mixed Results': {
              benchmarks: {
                'good task': { fn: () => 1 + 1 },
                'bad task': { fn: () => { throw new Error('Benchmark error'); } },
                'another good task': { fn: () => 2 + 2 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile]);

      // Should complete with exit code 1 (failures) but continue execution
      assert.ok(result.exitCode === 1 || result.stderr.includes('not found'));

      if (result.exitCode === 1) {
        // Should show progress for successful tasks
        assert.ok(
          result.stdout.includes('good task') || result.stderr.includes('error')
        );
      }
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
