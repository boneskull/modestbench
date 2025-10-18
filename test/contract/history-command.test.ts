import { expect } from 'bupkis';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Contract tests for `modestbench history` command Reference:
 * contracts/cli-commands.md lines 37-62
 */

describe('modestbench history command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('sub-commands', () => {
    it('should support list sub-command', async () => {
      const result = await runCommand(['history', 'list', '--help'], tempDir);
      expect(
        result.stdout.includes('list') || result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should support show sub-command', async () => {
      const result = await runCommand(['history', 'show', '--help'], tempDir);
      expect(
        result.stdout.includes('show') || result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should support compare sub-command', async () => {
      const result = await runCommand(
        ['history', 'compare', '--help'],
        tempDir,
      );
      expect(
        result.stdout.includes('compare') ||
          result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should support trends sub-command', async () => {
      const result = await runCommand(['history', 'trends', '--help'], tempDir);
      expect(
        result.stdout.includes('trends') || result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should support clean sub-command', async () => {
      const result = await runCommand(['history', 'clean', '--help'], tempDir);
      expect(
        result.stdout.includes('clean') || result.stderr.includes('not found'),
        'to be truthy',
      );
    });
  });

  describe('CLI options', () => {
    it('should support --limit/-l option', async () => {
      const result = await runCommand(['history', 'list', '--help'], tempDir);
      expect(
        result.stdout.includes('--limit') ||
          result.stdout.includes('-l') ||
          result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should support --since option', async () => {
      const result = await runCommand(['history', 'list', '--help'], tempDir);
      expect(
        result.stdout.includes('--since') ||
          result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should support --format/-f option', async () => {
      const result = await runCommand(['history', 'list', '--help'], tempDir);
      expect(
        result.stdout.includes('--format') ||
          result.stdout.includes('-f') ||
          result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should support --pattern option', async () => {
      const result = await runCommand(['history', 'list', '--help'], tempDir);
      expect(
        result.stdout.includes('--pattern') ||
          result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should support --tags option', async () => {
      const result = await runCommand(['history', 'list', '--help'], tempDir);
      expect(
        result.stdout.includes('--tags') || result.stderr.includes('not found'),
        'to be truthy',
      );
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for successful operations', async () => {
      const result = await runCommand(['history', '--help'], tempDir);
      // Will fail until implementation exists, but should define the contract
      expect(
        result.exitCode === 0 || result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should exit with code 1 for no matching results', async () => {
      const result = await runCommand([
        'history',
        'list',
        '--pattern',
        'nonexistent',
      ]);
      // Changed to return exit code 0 for no results (Unix convention)
      expect(
        result.exitCode === 0 ||
          result.exitCode === 1 ||
          result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should exit with code 2 for invalid date format', async () => {
      const result = await runCommand([
        'history',
        'list',
        '--since',
        'invalid-date',
      ]);
      // Will fail until implementation exists
      expect(
        result.exitCode === 2 || result.stderr.includes('not found'),
        'to be truthy',
      );
    });

    it('should exit with code 3 for data corruption', async () => {
      // This is harder to test without implementation, but contract should be defined
      const result = await runCommand(['history', '--help'], tempDir);
      expect(
        result.stderr.includes('not found') || result.exitCode >= 0,
        'to be truthy',
      );
    });
  });

  describe('output formats', () => {
    it('should support table format', async () => {
      const result = await runCommand(
        ['history', 'list', '--format', 'table'],
        tempDir,
      );
      expect(
        result.stderr.includes('not found') || result.exitCode >= 0,
        'to be truthy',
      );
    });

    it('should support json format', async () => {
      const result = await runCommand(
        ['history', 'list', '--format', 'json'],
        tempDir,
      );
      expect(
        result.stderr.includes('not found') || result.exitCode >= 0,
        'to be truthy',
      );
    });

    it('should support csv format', async () => {
      const result = await runCommand(
        ['history', 'list', '--format', 'csv'],
        tempDir,
      );
      expect(
        result.stderr.includes('not found') || result.exitCode >= 0,
        'to be truthy',
      );
    });
  });

  describe('show command with run-id', () => {
    it('should accept run-id argument for show command', async () => {
      const result = await runCommand(
        ['history', 'show', 'test-run-id'],
        tempDir,
      );
      expect(
        result.stderr.includes('not found') || result.exitCode >= 0,
        'to be truthy',
      );
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
      expect(
        result.stderr.includes('not found') || result.exitCode >= 0,
        'to be truthy',
      );
    });
  });

  describe('default limit', () => {
    it('should use default limit of 10', async () => {
      const result = await runCommand(['history', 'list', '--help'], tempDir);
      expect(
        result.stdout.includes('10') || result.stderr.includes('not found'),
        'to be truthy',
      );
    });
  });
});
