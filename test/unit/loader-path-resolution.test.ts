import { expect } from 'bupkis';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { BenchmarkFileLoader } from '../../src/core/loader.js';

describe('BenchmarkFileLoader - path resolution', () => {
  let tempDir: string;
  let loader: BenchmarkFileLoader;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-loader-'));
    loader = new BenchmarkFileLoader();
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('directory path handling', () => {
    it('should recursively find benchmark files when given a directory path', async () => {
      // Create nested structure
      await mkdir(join(tempDir, 'benchmarks', 'nested'), { recursive: true });
      await writeFile(
        join(tempDir, 'benchmarks', 'top.bench.js'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'benchmarks', 'nested', 'deep.bench.js'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'benchmarks', 'not-bench.js'),
        'export default {}',
      );

      const files = await loader.discover(join(tempDir, 'benchmarks'));

      expect(files.length, 'to equal', 2);
      expect(
        files.some((f) => f.includes('top.bench.js')),
        'to be truthy',
      );
      expect(
        files.some((f) => f.includes('deep.bench.js')),
        'to be truthy',
      );
    });

    it('should support all file extensions including .cts and .mts', async () => {
      await mkdir(join(tempDir, 'benchmarks'), { recursive: true });
      await writeFile(
        join(tempDir, 'benchmarks', 'test.bench.js'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'benchmarks', 'test.bench.ts'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'benchmarks', 'test.bench.mjs'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'benchmarks', 'test.bench.cjs'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'benchmarks', 'test.bench.mts'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'benchmarks', 'test.bench.cts'),
        'export default { suites: {} }',
      );

      const files = await loader.discover(join(tempDir, 'benchmarks'));

      expect(files.length, 'to equal', 6);
    });

    it('should handle multiple directory paths', async () => {
      await mkdir(join(tempDir, 'dir1'), { recursive: true });
      await mkdir(join(tempDir, 'dir2'), { recursive: true });
      await writeFile(
        join(tempDir, 'dir1', 'test1.bench.js'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'dir2', 'test2.bench.js'),
        'export default { suites: {} }',
      );

      const files = await loader.discover([
        join(tempDir, 'dir1'),
        join(tempDir, 'dir2'),
      ]);

      expect(files.length, 'to equal', 2);
    });
  });

  describe('empty pattern handling', () => {
    it('should use sensible defaults when given empty array', async () => {
      // Create files in current directory (top-level) and bench/ (top-level)
      await writeFile(
        join(tempDir, 'top.bench.js'),
        'export default { suites: {} }',
      );
      await mkdir(join(tempDir, 'bench'), { recursive: true });
      await writeFile(
        join(tempDir, 'bench', 'inside.bench.js'),
        'export default { suites: {} }',
      );
      await mkdir(join(tempDir, 'bench', 'nested'), { recursive: true });
      await writeFile(
        join(tempDir, 'bench', 'nested', 'deep.bench.js'),
        'export default { suites: {} }',
      );
      await mkdir(join(tempDir, 'other'), { recursive: true });
      await writeFile(
        join(tempDir, 'other', 'other.bench.js'),
        'export default { suites: {} }',
      );

      // Change to tempDir for discovery
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const files = await loader.discover([]);

        // Should find: top.bench.js and bench/inside.bench.js
        // Should NOT find: bench/nested/deep.bench.js or other/other.bench.js
        expect(files.length, 'to equal', 2);
        expect(
          files.some((f) => f.includes('top.bench.js')),
          'to be truthy',
        );
        expect(
          files.some((f) => f.includes('inside.bench.js')),
          'to be truthy',
        );
        expect(
          files.some((f) => f.includes('deep.bench.js')),
          'to be falsy',
        );
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('mixed patterns', () => {
    it('should handle mix of files, directories, and globs', async () => {
      await mkdir(join(tempDir, 'dir1'), { recursive: true });
      await mkdir(join(tempDir, 'dir2', 'nested'), { recursive: true });
      await writeFile(
        join(tempDir, 'specific.bench.js'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'dir1', 'fromdir.bench.js'),
        'export default { suites: {} }',
      );
      await writeFile(
        join(tempDir, 'dir2', 'nested', 'fromglob.bench.js'),
        'export default { suites: {} }',
      );

      const files = await loader.discover([
        join(tempDir, 'specific.bench.js'), // explicit file
        join(tempDir, 'dir1'), // directory
        join(tempDir, 'dir2/**/*.bench.js'), // glob
      ]);

      expect(files.length, 'to equal', 3);
    });
  });
});
