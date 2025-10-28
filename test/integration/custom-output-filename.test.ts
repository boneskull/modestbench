import { expect } from 'bupkis';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

describe('Custom output filename', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
  });

  it('should error when using --output-file with multiple reporters', async () => {
    const benchFile = join(tempDir, 'test.bench.js');
    await writeFile(
      benchFile,
      `
      export default {
        suites: {
          'Test Suite': {
            benchmarks: {
              'simple task': {
                fn: () => 42
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
      '--reporter',
      'json,csv',
      '--output-file',
      'custom.json',
    ]);

    expect(result.exitCode, 'to be greater than', 0);
    expect(result.stderr, 'to contain', '--output-file');
    expect(result.stderr, 'to contain', 'single reporter');
  });

  it('should succeed when using --output-file with single reporter', async () => {
    const benchFile = join(tempDir, 'test.bench.js');
    await writeFile(
      benchFile,
      `
      export default {
        suites: {
          'Test Suite': {
            benchmarks: {
              'simple task': {
                fn: () => 42
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
      '--reporter',
      'json',
      '--output-file',
      'custom.json',
      '--output',
      tempDir,
    ]);

    expect(result.exitCode, 'to equal', 0);
  });

  it('should write to custom filename with --output-file and --output', async () => {
    const benchFile = join(tempDir, 'test.bench.js');
    await writeFile(
      benchFile,
      `
      export default {
        suites: {
          'Test Suite': {
            benchmarks: {
              'simple task': {
                fn: () => 42
              }
            }
          }
        }
      };
      `,
    );

    const customFile = 'my-benchmarks.json';
    const result = await runCommand([
      'run',
      benchFile,
      '--reporter',
      'json',
      '--output',
      tempDir,
      '--output-file',
      customFile,
    ]);

    expect(result.exitCode, 'to equal', 0);

    // Verify custom filename was used
    const outputPath = join(tempDir, customFile);
    const content = await readFile(outputPath, 'utf-8');
    const data = JSON.parse(content);
    // Check for valid JSON structure
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    expect(data.meta, 'to be defined');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    expect(data.run, 'to be defined');
  });

  it('should write to custom filename without --output (relative to cwd)', async () => {
    const benchFile = join(tempDir, 'test.bench.js');
    await writeFile(
      benchFile,
      `
      export default {
        suites: {
          'Test Suite': {
            benchmarks: {
              'simple task': {
                fn: () => 42
              }
            }
          }
        }
      };
      `,
    );

    // Use absolute path to avoid cwd issues in test
    const customFile = join(tempDir, 'standalone.json');
    const result = await runCommand([
      'run',
      benchFile,
      '--reporter',
      'json',
      '--output-file',
      customFile,
    ]);

    expect(result.exitCode, 'to equal', 0);

    // Verify custom filename was used
    const content = await readFile(customFile, 'utf-8');
    const data = JSON.parse(content);
    // Check for valid JSON structure
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    expect(data.meta, 'to be defined');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    expect(data.run, 'to be defined');
  });

  it('should work with CSV reporter and custom filename', async () => {
    const benchFile = join(tempDir, 'test.bench.js');
    await writeFile(
      benchFile,
      `
      export default {
        suites: {
          'Test Suite': {
            benchmarks: {
              'simple task': {
                fn: () => 42
              }
            }
          }
        }
      };
      `,
    );

    const customFile = 'benchmarks.csv';
    const result = await runCommand([
      'run',
      benchFile,
      '--reporter',
      'csv',
      '--output',
      tempDir,
      '--output-file',
      customFile,
    ]);

    expect(result.exitCode, 'to equal', 0);

    const outputPath = join(tempDir, customFile);
    const content = await readFile(outputPath, 'utf-8');
    expect(content, 'to contain', 'suite,task');
  });

  describe('Edge cases', () => {
    it('should handle absolute paths for --output-file', async () => {
      const benchFile = join(tempDir, 'test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Test Suite': {
              benchmarks: {
                'simple task': { fn: () => 42 }
              }
            }
          }
        };
        `,
      );

      const absolutePath = join(tempDir, 'absolute', 'custom.json');
      const result = await runCommand([
        'run',
        benchFile,
        '--reporter',
        'json',
        '--output-file',
        absolutePath,
      ]);

      expect(result.exitCode, 'to equal', 0);
      const content = await readFile(absolutePath, 'utf-8');
      const data = JSON.parse(content);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data.meta, 'to be defined');
    });

    it('should handle outputFile with subdirectories', async () => {
      const benchFile = join(tempDir, 'test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Test Suite': {
              benchmarks: {
                'simple task': { fn: () => 42 }
              }
            }
          }
        };
        `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporter',
        'json',
        '--output',
        tempDir,
        '--output-file',
        'subdir/custom.json',
      ]);

      expect(result.exitCode, 'to equal', 0);
      const outputPath = join(tempDir, 'subdir', 'custom.json');
      const content = await readFile(outputPath, 'utf-8');
      const data = JSON.parse(content);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data.meta, 'to be defined');
    });

    it('should work with --of short flag', async () => {
      const benchFile = join(tempDir, 'test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Test Suite': {
              benchmarks: {
                'simple task': { fn: () => 42 }
              }
            }
          }
        };
        `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporter',
        'json',
        '--output',
        tempDir,
        '--of',
        'short-flag.json',
      ]);

      expect(result.exitCode, 'to equal', 0);
      const outputPath = join(tempDir, 'short-flag.json');
      const content = await readFile(outputPath, 'utf-8');
      const data = JSON.parse(content);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data.meta, 'to be defined');
    });
  });
});
