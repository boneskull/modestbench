import { expect } from 'bupkis';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Integration tests for --bail flag functionality. The bail flag should stop
 * execution on the first benchmark failure
 */

describe('Bail flag (--bail)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    await mkdir(join(tempDir, 'benchmarks'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  it('should stop execution after first failing benchmark', async () => {
    // Create first benchmark file that will fail
    const failingBench = join(tempDir, 'benchmarks', '1-failing.bench.js');
    await writeFile(
      failingBench,
      `
        export default {
          suites: {
            'Failing Suite': {
              benchmarks: {
                'failing task': {
                  fn: () => {
                    throw new Error('Intentional failure');
                  }
                }
              }
            }
          }
        };
      `,
    );

    // Create second benchmark file that should NOT run
    const successBench = join(tempDir, 'benchmarks', '2-success.bench.js');
    await writeFile(
      successBench,
      `
        export default {
          suites: {
            'Success Suite': {
              benchmarks: {
                'success task': {
                  fn: () => 1
                }
              }
            }
          }
        };
      `,
    );

    // Run with --bail flag
    const result = await runCommand(
      [
        'run',
        join(tempDir, 'benchmarks', '*.bench.js'),
        '--bail',
        '--reporters',
        'human',
      ],
      tempDir,
    );

    // Should exit with non-zero code due to failure
    expect(result.exitCode, 'to be greater than', 0);

    const combinedOutput = result.stdout + result.stderr;

    // Verify first benchmark ran and failed
    expect(combinedOutput, 'to match', /1-failing\.bench\.js/);
    expect(combinedOutput, 'to match', /failing task/);
    expect(combinedOutput, 'to match', /Intentional failure/);

    // Second benchmark file should NOT appear in output when --bail is used
    // (this is the key assertion that will pass once bail is implemented)
    expect(combinedOutput, 'not to match', /2-success\.bench\.js/);
    expect(combinedOutput, 'not to match', /success task/);
  });

  it('should run all benchmarks without --bail flag (control)', async () => {
    // Create first benchmark file that will fail
    const failingBench = join(tempDir, 'benchmarks', '1-failing.bench.js');
    await writeFile(
      failingBench,
      `
        export default {
          suites: {
            'Failing Suite': {
              benchmarks: {
                'failing task': {
                  fn: () => {
                    throw new Error('Intentional failure');
                  }
                }
              }
            }
          }
        };
      `,
    );

    // Create second benchmark file
    const successBench = join(tempDir, 'benchmarks', '2-success.bench.js');
    await writeFile(
      successBench,
      `
        export default {
          suites: {
            'Success Suite': {
              benchmarks: {
                'success task': {
                  fn: () => 1
                }
              }
            }
          }
        };
      `,
    );

    // Run WITHOUT --bail flag - both benchmarks should run
    const result = await runCommand(
      [
        'run',
        join(tempDir, 'benchmarks', '*.bench.js'),
        '--reporters',
        'human',
      ],
      tempDir,
    );

    // Should exit with non-zero code due to failure
    expect(result.exitCode, 'to be greater than', 0);

    const combinedOutput = result.stdout + result.stderr;

    // Both benchmarks should appear in output (default behavior without --bail)
    expect(combinedOutput, 'to match', /1-failing\.bench\.js/);
    expect(combinedOutput, 'to match', /failing task/);
    expect(combinedOutput, 'to match', /2-success\.bench\.js/);
    expect(combinedOutput, 'to match', /success task/);
  });
});
