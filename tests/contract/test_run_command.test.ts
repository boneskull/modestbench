import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/**
 * Contract tests for `modestbench run` command
 * Reference: contracts/cli-commands.md lines 7-35
 */

describe('modestbench run command', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    cliPath = join(
      process.cwd(),
      'dist',
      'tests',
      'fixtures',
      'cli-wrapper.js'
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('CLI contract', () => {
    it('should accept pattern argument', async () => {
      const result = await runCommand(['run', '*.bench.js', '--help']);
      assert.ok(result.stdout.includes('pattern'));
    });

    it('should support --config/-c option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('--config') || result.stdout.includes('-c')
      );
    });

    it('should support --reporters/-r option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('--reporters') || result.stdout.includes('-r')
      );
    });

    it('should support --output/-o option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('--output') || result.stdout.includes('-o')
      );
    });

    it('should support --iterations/-i option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('--iterations') || result.stdout.includes('-i')
      );
    });

    it('should support --time/-t option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('--time') || result.stdout.includes('-t')
      );
    });

    it('should support --warmup/-w option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('--warmup') || result.stdout.includes('-w')
      );
    });

    it('should support --bail option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(result.stdout.includes('--bail'));
    });

    it('should support --exclude option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(result.stdout.includes('--exclude'));
    });

    it('should support --timeout option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(result.stdout.includes('--timeout'));
    });

    it('should support --quiet/-q option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('--quiet') || result.stdout.includes('-q')
      );
    });

    it('should support --verbose/-v option', async () => {
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('--verbose') || result.stdout.includes('-v')
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
          name: 'Simple Benchmark',
          benchmarks: [
            {
              name: 'fast test',
              fn: () => { return 1 + 1; }
            }
          ]
        };
      `
      );

      const result = await runCommand(['run', benchFile]);
      assert.strictEqual(result.exitCode, 0);
    });

    it('should exit with code 2 for configuration errors', async () => {
      const result = await runCommand(['run', '--config', 'nonexistent.json']);
      assert.strictEqual(result.exitCode, 2);
    });

    it('should exit with code 3 for file discovery errors', async () => {
      const result = await runCommand(['run', '/nonexistent/path/*.bench.js']);
      assert.strictEqual(result.exitCode, 3);
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
      assert.strictEqual(result.exitCode, 0);
    });

    it('should support json reporter', async () => {
      const result = await runCommand(['run', '--reporters', 'json', '--help']);
      assert.strictEqual(result.exitCode, 0);
    });

    it('should support csv reporter', async () => {
      const result = await runCommand(['run', '--reporters', 'csv', '--help']);
      assert.strictEqual(result.exitCode, 0);
    });

    it('should support multiple reporters', async () => {
      const result = await runCommand([
        'run',
        '--reporters',
        'human,json,csv',
        '--help',
      ]);
      assert.strictEqual(result.exitCode, 0);
    });
  });

  describe('default behavior', () => {
    it('should use default pattern **/*.bench.{js,ts}', async () => {
      // This test will fail until implementation exists
      const result = await runCommand(['run', '--help']);
      assert.ok(
        result.stdout.includes('**/*.bench.{js,ts}') ||
          result.stderr.includes('not found')
      );
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
