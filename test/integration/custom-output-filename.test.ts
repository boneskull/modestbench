import { expect } from 'bupkis';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.ts';

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
      '--reporters',
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
      '--reporters',
      'json',
      '--output-file',
      'custom.json',
      '--output',
      tempDir,
    ]);

    expect(result.exitCode, 'to equal', 0);
  });
});
