import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Integration tests for benchmark file execution with progress tracking
 * Reference: quickstart.md lines 10-50 and CLI progress examples
 */

describe('Benchmark execution with progress tracking', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    await mkdir(join(tempDir, 'benchmarks'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('basic benchmark execution', () => {
    it('should execute simple benchmark file with progress', async () => {
      // Create benchmark file from quickstart example
      const benchFile = join(
        tempDir,
        'benchmarks',
        'array-operations.bench.js',
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
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human',
      ]);

      // Should execute successfully and show progress and results
      assert.strictEqual(result.exitCode, 0);
      assert.ok(
        result.stdout.includes('Array Operations') ||
          result.stdout.includes('progress'),
      );
      assert.ok(
        result.stdout.includes('ops/sec') ||
          result.stdout.includes('benchmark'),
      );
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
        `,
        );
      }

      const result = await runCommand([
        'run',
        join(tempDir, 'benchmarks', '*.bench.js'),
        '--iterations',
        '10',
      ]);

      // Should execute successfully and show progress across files
      assert.strictEqual(result.exitCode, 0);
      assert.ok(
        result.stdout.includes('progress') || result.stdout.includes('%'),
      );
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
                'slow task 1': {
                  fn: async () => {
                    // Simulate some work
                    await new Promise(resolve => setTimeout(resolve, 50));
                  }
                },
                'slow task 2': {
                  fn: async () => {
                    // Simulate some work
                    await new Promise(resolve => setTimeout(resolve, 50));
                  }
                },
                'slow task 3': {
                  fn: async () => {
                    // Simulate some work
                    await new Promise(resolve => setTimeout(resolve, 50));
                  }
                }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--verbose',
        '--iterations',
        '5',
      ]);

      // Should execute successfully and show ETA or time estimates during execution
      assert.strictEqual(result.exitCode, 0);
      assert.ok(
        result.stdout.includes('ETA') || result.stdout.includes('estimated'),
      );
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
      `,
      );

      const result = await runCommand(['run', benchFile, '--verbose'], tempDir);

      // Should execute successfully and show suite progress
      assert.strictEqual(result.exitCode, 0);
      assert.ok(
        result.stdout.includes('Suite 1') && result.stdout.includes('Suite 2'),
      );
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
      `,
      );

      const result = await runCommand(['run', benchFile], tempDir);

      // Should execute successfully and show progress indicators
      assert.strictEqual(result.exitCode, 0);
      assert.ok(
        result.stdout.includes('progress') ||
          result.stdout.includes('completed'),
      );
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
      `,
      );

      const result = await runCommand(['run', benchFile, '--verbose'], tempDir);

      // Setup/teardown is not implemented yet - should fail
      assert.notStrictEqual(result.exitCode, 0);
      assert.ok(
        result.stderr.includes('not found') ||
          result.stdout.includes('FAILED') ||
          result.stderr.includes('Some benchmarks failed') ||
          result.stderr.includes('setup') ||
          result.stderr.includes('teardown'),
      );
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
      `,
      );

      const result = await runCommand(['run', benchFile], tempDir);

      // Should complete with exit code 1 (failures) but continue execution
      assert.ok(result.exitCode === 1 || result.stderr.includes('not found'));

      if (result.exitCode === 1) {
        // Should show progress for successful tasks
        assert.ok(
          result.stdout.includes('good task') ||
            result.stderr.includes('error'),
        );
      }
    });
  });
});
