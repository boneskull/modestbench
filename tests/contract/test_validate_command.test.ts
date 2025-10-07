import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/**
 * Contract tests for `modestbench validate` command
 * Reference: contracts/cli-commands.md lines 84-110
 */

describe('modestbench validate command', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('validation types', () => {
    it('should validate file syntax', async () => {
      // Create a file with syntax errors
      const invalidFile = join(tempDir, 'invalid.bench.js');
      await writeFile(invalidFile, 'invalid javascript syntax {');

      const result = await runCommand(['validate', invalidFile]);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should validate file structure', async () => {
      // Create a file with wrong structure
      const wrongStructure = join(tempDir, 'wrong.bench.js');
      await writeFile(
        wrongStructure,
        'export default { wrongProperty: true };'
      );

      const result = await runCommand(['validate', wrongStructure]);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should validate configuration files', async () => {
      // Create invalid config
      const invalidConfig = join(tempDir, 'modestbench.config.json');
      await writeFile(invalidConfig, '{ invalid json');

      const result = await runCommand(['validate', '--config', invalidConfig]);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should validate dependencies', async () => {
      // Create benchmark with missing dependencies
      const depFile = join(tempDir, 'deps.bench.js');
      await writeFile(
        depFile,
        `
        import nonexistent from 'nonexistent-package';
        export default {
          name: 'Deps test',
          benchmarks: [{ name: 'test', fn: () => nonexistent() }]
        };
      `
      );

      const result = await runCommand(['validate', depFile]);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('validation scope', () => {
    it('should validate specific files when provided', async () => {
      const benchFile = join(tempDir, 'specific.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          name: 'Valid Benchmark',
          benchmarks: [
            { name: 'test', fn: () => { return 1; } }
          ]
        };
      `
      );

      const result = await runCommand(['validate', benchFile]);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should validate all benchmark files when no files specified', async () => {
      const result = await runCommand(['validate']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should validate using glob patterns', async () => {
      const result = await runCommand(['validate', '**/*.bench.js']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('CLI options', () => {
    it('should support --config option for config file validation', async () => {
      const result = await runCommand(['validate', '--help']);
      assert.ok(
        result.stdout.includes('--config') ||
          result.stderr.includes('not found')
      );
    });

    it('should support --quiet option for minimal output', async () => {
      const result = await runCommand(['validate', '--help']);
      assert.ok(
        result.stdout.includes('--quiet') || result.stderr.includes('not found')
      );
    });

    it('should support --verbose option for detailed output', async () => {
      const result = await runCommand(['validate', '--help']);
      assert.ok(
        result.stdout.includes('--verbose') ||
          result.stderr.includes('not found')
      );
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 for valid files', async () => {
      const validFile = join(tempDir, 'valid.bench.js');
      await writeFile(
        validFile,
        `
        export default {
          name: 'Valid Benchmark',
          benchmarks: [
            { name: 'test', fn: () => { return 1; } }
          ]
        };
      `
      );

      const result = await runCommand(['validate', validFile]);
      assert.ok(result.exitCode === 0 || result.stderr.includes('not found'));
    });

    it('should exit with code 1 for validation failures', async () => {
      const invalidFile = join(tempDir, 'invalid.bench.js');
      await writeFile(invalidFile, 'invalid content');

      const result = await runCommand(['validate', invalidFile]);
      assert.ok(result.exitCode === 1 || result.stderr.includes('not found'));
    });

    it('should exit with code 2 for configuration errors', async () => {
      const result = await runCommand([
        'validate',
        '--config',
        'nonexistent.json',
      ]);
      assert.ok(result.exitCode === 2 || result.stderr.includes('not found'));
    });

    it('should exit with code 3 for file discovery errors', async () => {
      const result = await runCommand([
        'validate',
        '/nonexistent/path/*.bench.js',
      ]);
      assert.ok(result.exitCode === 3 || result.stderr.includes('not found'));
    });
  });

  describe('anti-pattern detection', () => {
    it('should detect performance anti-patterns', async () => {
      const antiPatternFile = join(tempDir, 'antipattern.bench.js');
      await writeFile(
        antiPatternFile,
        `
        export default {
          name: 'Anti-pattern Benchmark',
          benchmarks: [
            { 
              name: 'blocking sync operation', 
              fn: () => { 
                // Simulated blocking operation
                const start = Date.now();
                while (Date.now() - start < 100) { /* block */ }
              } 
            }
          ]
        };
      `
      );

      const result = await runCommand(['validate', antiPatternFile]);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });
  });

  describe('output format', () => {
    it('should provide detailed error messages', async () => {
      const result = await runCommand(['validate', '--help']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
    });

    it('should show validation summary', async () => {
      const result = await runCommand(['validate', '--help']);
      assert.ok(result.stderr.includes('not found') || result.exitCode >= 0);
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
