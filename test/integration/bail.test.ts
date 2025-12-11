import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { runCommand } from '../util.js';
import { fixtures } from './fixture-paths.js';

/**
 * Integration tests for --bail flag functionality. The bail flag should stop
 * execution on the first benchmark failure
 */

describe('Bail flag (--bail)', () => {
  it('should stop execution after first failing benchmark', async () => {
    // Run with --bail flag - failing fixture runs first (alphabetically)
    // failing.bench.js comes before success.bench.js
    const result = await runCommand([
      'run',
      fixtures.failing,
      fixtures.success,
      '--bail',
      '--reporter',
      'human',
    ]);

    // Should exit with non-zero code due to failure
    expect(result.exitCode, 'to be greater than', 0);

    const combinedOutput = result.stdout + result.stderr;

    // Verify first benchmark ran and failed
    expect(combinedOutput, 'to match', /Failing Suite/);
    expect(combinedOutput, 'to match', /failing task/);
    expect(combinedOutput, 'to match', /Intentional failure/);

    // Second benchmark suite should NOT appear in output when --bail is used
    // (this is the key assertion that will pass once bail is implemented)
    expect(combinedOutput, 'not to match', /Success Suite/);
    expect(combinedOutput, 'not to match', /success task/);
  });

  it('should run all benchmarks without --bail flag (control)', async () => {
    // Run WITHOUT --bail flag - both benchmarks should run
    const result = await runCommand([
      'run',
      fixtures.failing,
      fixtures.success,
      '--reporter',
      'human',
    ]);

    // Should exit with non-zero code due to failure
    expect(result.exitCode, 'to be greater than', 0);

    const combinedOutput = result.stdout + result.stderr;

    // Both benchmarks should appear in output (default behavior without --bail)
    expect(combinedOutput, 'to match', /Failing Suite/);
    expect(combinedOutput, 'to match', /failing task/);
    expect(combinedOutput, 'to match', /Success Suite/);
    expect(combinedOutput, 'to match', /success task/);
  });
});
