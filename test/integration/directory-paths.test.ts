import { expect } from 'bupkis';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';
import { fixtures } from './fixture-paths.js';

describe('CLI directory path handling', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-dir-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  it('should find benchmark files recursively when given directory path', async () => {
    // Use fixture nested directory which contains Suite 1 and Suite 2 (in deep/)
    const result = await runCommand(
      ['run', fixtures.nestedDir, '--iterations', '1'],
      dirname(fixtures.nestedDir),
    );

    expect(result.exitCode, 'to equal', 0);
    expect(result.stdout, 'to match', /Suite 1/);
    expect(result.stdout, 'to match', /Suite 2/);
  });

  it('should use sensible defaults when no paths provided', async () => {
    // This test requires specific directory structure relative to cwd
    // so we need to create files dynamically

    // Top-level file (should NOT be found with default pattern bench/**/*.bench.*)
    await writeFile(
      join(tempDir, 'top.bench.js'),
      'export default { suites: { "Top": { benchmarks: { "test": { fn: () => 1 } } } } };',
    );

    // bench/ directory file (should be found)
    await mkdir(join(tempDir, 'bench'), { recursive: true });
    await writeFile(
      join(tempDir, 'bench', 'inside.bench.js'),
      'export default { suites: { "Inside": { benchmarks: { "test": { fn: () => 1 } } } } };',
    );

    // Nested in bench/ (should be found with recursive ** pattern)
    await mkdir(join(tempDir, 'bench', 'nested'), { recursive: true });
    await writeFile(
      join(tempDir, 'bench', 'nested', 'deep.bench.js'),
      'export default { suites: { "Deep": { benchmarks: { "test": { fn: () => 1 } } } } };',
    );

    const result = await runCommand(['run', '--iterations', '1'], tempDir);

    expect(result.exitCode, 'to equal', 0);
    expect(result.stdout, 'not to match', /Top/); // Top-level not in default pattern
    expect(result.stdout, 'to match', /Inside/); // bench/ directory
    expect(result.stdout, 'to match', /Deep/); // Recursive in bench/
  });

  it('should support all extensions including .cts and .mts', async () => {
    // Use fixture directory containing .mts and .cts files
    const result = await runCommand(
      [
        'run',
        fixtures.extensionMts,
        fixtures.extensionCts,
        '--iterations',
        '1',
      ],
      dirname(fixtures.extensionMts),
    );

    expect(result.exitCode, 'to equal', 0);
    expect(result.stdout, 'to match', /MTS|CTS/);
  });
});
