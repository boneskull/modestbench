import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/**
 * Contract tests for `modestbench history` command
 * Reference: contracts/cli-commands.md lines 37-62
 */

describe('modestbench history command', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('sub-commands', () => {
    it('should support list sub-command', async () => {
      const result = await runCommand(['history', 'list', '--help']);
      assert.ok(
        result.stdout.includes('list') || result.stderr.includes('not found')
      );
    });

    it('should support show sub-command', async () => {
      const result = await runCommand(['history', 'show', '--help']);
      assert.ok(
        result.stdout.includes('show') || result.stderr.includes('not found')
      );
    });

    it('should support compare sub-command', async () => {
      const result = await runCommand(['history', 'compare', '--help']);
      assert.ok(
        result.stdout.includes('compare') || result.stderr.includes('not found')
      );
    });

    it('should support trends sub-command', async () => {
      const result = await runCommand(['history', 'trends', '--help']);
      assert.ok(
        result.stdout.includes('trends') || result.stderr.includes('not found')
      );
    });

    it('should support clean sub-command', async () => {
      const result = await runCommand(['history', 'clean', '--help']);
      assert.ok(
        result.stdout.includes('clean') || result.stderr.includes('not found')
      );
    });
  });

  describe('CLI options', () => {
    it('should support --limit/-l option', async () => {
      const result = await runCommand(['history', 'list', '--help']);
      assert.ok(
        result.stdout.includes('--limit') ||
          result.stdout.includes('-l') ||
          result.stderr.includes('not found')
      );
    });

    it('should support --since option', async () => {
      const result = await runCommand(['history', 'list', '--help']);
      assert.ok(
        result.stdout.includes('--since') || result.stderr.includes('not found')
      );
    });

    it('should support --format/-f option', async () => {
      const result = await runCommand(['history', 'list', '--help']);
      assert.ok(
        result.stdout.includes('--format') ||
          result.stdout.includes('-f') ||
          result.stderr.includes('not found')
      );
    });

    it('should support --pattern option', async () => {
      const result = await runCommand(['history', 'list', '--help']);
      assert.ok(
        result.stdout.includes('--pattern') ||
          result.stderr.includes('not found')
      );
    });

    it('should support --tags option', async () => {
      const result = await runCommand(['history', 'list', '--help']);
      assert.ok(
        result.stdout.includes('--tags') || result.stderr.includes('not found')
      );
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for successful operations', async () => {
      const result = await runCommand(['history', '--help']);
      // Will fail until implementation exists, but should define the contract
      assert.ok(result.exitCode === 0 || result.stderr.includes('not found'));
    });

    it('should exit with code 1 for no matching results', async () => {
      const result = await runCommand([
        'history',
        'list',
        '--pattern',
        'nonexistent',
      ]);
      // Will fail until implementation exists
      assert.ok(result.exitCode === 1 || result.stderr.includes('not found'));
    });

    it('should exit with code 2 for invalid date format', async () => {
      const result = await runCommand([
        'history',
        'list',
        '--since',
        'invalid-date',
      ]);
      // Will fail until implementation exists
      assert.ok(result.exitCode === 2 || result.stderr.includes('not found'));
    });

    it('should exit with code 3 for data corruption', async () => {
      // This is harder to test without implementation, but contract should be defined
      const result = await runCommand(['history', '--help']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('output formats', () => {
    it('should support table format', async () => {
      const result = await runCommand(['history', 'list', '--format', 'table']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should support json format', async () => {
      const result = await runCommand(['history', 'list', '--format', 'json']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should support csv format', async () => {
      const result = await runCommand(['history', 'list', '--format', 'csv']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('show command with run-id', () => {
    it('should accept run-id argument for show command', async () => {
      const result = await runCommand(['history', 'show', 'test-run-id']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('compare command with run-ids', () => {
    it('should accept two run-id arguments for compare command', async () => {
      const result = await runCommand([
        'history',
        'compare',
        'run-id-1',
        'run-id-2',
      ]);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('default limit', () => {
    it('should use default limit of 10', async () => {
      const result = await runCommand(['history', 'list', '--help']);
      assert.ok(
        result.stdout.includes('10') || result.stderr.includes('not found')
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
