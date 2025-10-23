import { expect } from 'bupkis';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

describe('CLI directory path handling', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-dir-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  it('should find benchmark files recursively when given directory path', async () => {
    await mkdir(join(tempDir, 'my-benchmarks', 'nested'), { recursive: true });
    await writeFile(
      join(tempDir, 'my-benchmarks', 'test1.bench.js'),
      'export default { suites: { "Suite 1": { benchmarks: { "test": { fn: () => 1 } } } } };',
    );
    await writeFile(
      join(tempDir, 'my-benchmarks', 'nested', 'test2.bench.js'),
      'export default { suites: { "Suite 2": { benchmarks: { "test": { fn: () => 1 } } } } };',
    );

    const result = await runCommand(
      ['run', join(tempDir, 'my-benchmarks'), '--iterations', '1'],
      tempDir,
    );

    expect(result.exitCode, 'to equal', 0);
    expect(result.stdout, 'to match', /Suite 1/);
    expect(result.stdout, 'to match', /Suite 2/);
  });

  it('should use sensible defaults when no paths provided', async () => {
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
    await mkdir(join(tempDir, 'benchmarks'), { recursive: true });

    await writeFile(
      join(tempDir, 'benchmarks', 'test.bench.mts'),
      'export default { suites: { "MTS": { benchmarks: { "test": { fn: () => 1 } } } } };',
    );
    await writeFile(
      join(tempDir, 'benchmarks', 'test.bench.cts'),
      'export default { suites: { "CTS": { benchmarks: { "test": { fn: () => 1 } } } } };',
    );

    const result = await runCommand(
      ['run', join(tempDir, 'benchmarks'), '--iterations', '1'],
      tempDir,
    );

    expect(result.exitCode, 'to equal', 0);
    expect(result.stdout, 'to match', /MTS|CTS/);
  });
});
