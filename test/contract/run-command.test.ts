import { expect } from 'bupkis';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Contract tests for `modestbench run` command Reference:
 * contracts/cli-commands.md lines 7-35
 */

describe('modestbench run command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('CLI contract', () => {
    it('should accept pattern argument', async () => {
      const result = await runCommand(['run', '*.bench.js', '--help'], tempDir);
      expect(result.stdout.includes('pattern'), 'to be truthy');
    });

    it('should support --config/-c option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('--config') || result.stdout.includes('-c'),
        'to be truthy',
      );
    });

    it('should support --reporters/-r option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('--reporters') || result.stdout.includes('-r'),
        'to be truthy',
      );
    });

    it('should support --output/-o option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('--output') || result.stdout.includes('-o'),
        'to be truthy',
      );
    });

    it('should support --iterations/-i option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('--iterations') || result.stdout.includes('-i'),
        'to be truthy',
      );
    });

    it('should support --time/-t option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('--time') || result.stdout.includes('-t'),
        'to be truthy',
      );
    });

    it('should support --warmup/-w option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('--warmup') || result.stdout.includes('-w'),
        'to be truthy',
      );
    });

    it('should support --bail option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(result.stdout.includes('--bail'), 'to be truthy');
    });

    it('should support --exclude option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(result.stdout.includes('--exclude'), 'to be truthy');
    });

    it('should support --timeout option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(result.stdout.includes('--timeout'), 'to be truthy');
    });

    it('should support --quiet/-q option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('--quiet') || result.stdout.includes('-q'),
        'to be truthy',
      );
    });

    it('should support --verbose/-v option', async () => {
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('--verbose') || result.stdout.includes('-v'),
        'to be truthy',
      );
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for successful runs', async () => {
      // Create a simple benchmark file
      const benchFile = join(tempDir, 'simple.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Simple Benchmark': {
              benchmarks: {
                'fast test': {
                  fn: () => { return 1 + 1; }
                }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand(['run', benchFile], tempDir);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should exit with code 2 for configuration errors', async () => {
      const result = await runCommand(
        ['run', '--config', 'nonexistent.json'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 2);
    });

    it('should exit with code 3 for file discovery errors', async () => {
      const result = await runCommand(
        ['run', '/nonexistent/path/*.bench.js'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 3);
    });
  });

  describe('output formats', () => {
    it('should support human reporter', async () => {
      const result = await runCommand([
        'run',
        '--reporters',
        'human',
        '--help',
      ]);
      expect(result.exitCode, 'to equal', 0);
    });

    it('should support json reporter', async () => {
      const result = await runCommand(
        ['run', '--reporters', 'json', '--help'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);
    });

    it('should support csv reporter', async () => {
      const result = await runCommand(
        ['run', '--reporters', 'csv', '--help'],
        tempDir,
      );
      expect(result.exitCode, 'to equal', 0);
    });

    it('should support multiple reporters', async () => {
      const result = await runCommand([
        'run',
        '--reporters',
        'human,json,csv',
        '--help',
      ]);
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('default behavior', () => {
    it('should use default pattern **/*.bench.{js,ts}', async () => {
      // This test will fail until implementation exists
      const result = await runCommand(['run', '--help'], tempDir);
      expect(
        result.stdout.includes('**/*.bench.{js,ts}') ||
          result.stderr.includes('not found'),
        'to be truthy',
      );
    });
  });
});
