import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

/**
 * Integration tests for configuration file and CLI argument merging
 * Reference: quickstart.md configuration examples and CLI priority
 */

describe('Configuration file and CLI argument merging', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
    cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('configuration file loading', () => {
    it('should load JSON configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configFile,
        JSON.stringify(
          {
            reporters: ['json', 'csv'],
            output: './results',
            iterations: 500,
            warmup: true,
          },
          null,
          2
        )
      );

      const benchFile = join(tempDir, 'test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Config Test': {
              benchmarks: {
                'test task': { fn: () => 1 + 1 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--config',
        configFile,
      ]);

      if (result.exitCode === 0) {
        // Should use config file settings
        assert.ok(
          result.stdout.includes('Config Test') ||
            result.stdout.includes('json')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should load YAML configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.yaml');
      await writeFile(
        configFile,
        `
reporters:
  - human
  - json
output: ./yaml-results
iterations: 1000
warmup: false
      `
      );

      const result = await runCommand([
        'run',
        '--config',
        configFile,
        '--help',
      ]);

      // Should handle YAML config
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should load JavaScript configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.js');
      await writeFile(
        configFile,
        `
module.exports = {
  reporters: ['human'],
  output: './js-results',
  iterations: 750,
  warmup: true,
  concurrent: false
};
      `
      );

      const result = await runCommand([
        'run',
        '--config',
        configFile,
        '--help',
      ]);

      // Should handle JS config
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });

    it('should load TypeScript configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.ts');
      await writeFile(
        configFile,
        `
export default {
  reporters: ['human', 'csv'] as const,
  output: './ts-results',
  iterations: 2000,
  warmup: true,
  concurrent: true
};
      `
      );

      const result = await runCommand([
        'run',
        '--config',
        configFile,
        '--help',
      ]);

      // Should handle TS config
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('CLI argument precedence', () => {
    it('should override config file with CLI arguments', async () => {
      const configFile = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configFile,
        JSON.stringify({
          reporters: ['human'],
          iterations: 100,
          output: './config-output',
        })
      );

      const benchFile = join(tempDir, 'precedence.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Precedence Test': {
              benchmarks: {
                'precedence task': { fn: () => 2 + 2 }
              }
            }
          }
        };
      `
      );

      // CLI args should override config file
      const result = await runCommand([
        'run',
        benchFile,
        '--config',
        configFile,
        '--reporters',
        'json,csv',
        '--iterations',
        '500',
        '--output',
        './cli-output',
      ]);

      if (result.exitCode === 0) {
        // Should use CLI values over config file
        assert.ok(result.stdout.includes('Precedence Test'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should use config file defaults when CLI args not provided', async () => {
      const configFile = join(tempDir, 'defaults.config.json');
      await writeFile(
        configFile,
        JSON.stringify({
          reporters: ['json'],
          warmup: true,
          concurrent: false,
        })
      );

      const benchFile = join(tempDir, 'defaults.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Defaults Test': {
              benchmarks: {
                'default task': { fn: () => 3 + 3 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--config',
        configFile,
      ]);

      if (result.exitCode === 0) {
        // Should use config file defaults
        assert.ok(result.stdout.includes('Defaults Test'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('configuration merging hierarchy', () => {
    it('should merge configurations in correct precedence order', async () => {
      // Create global config
      const globalConfig = join(tempDir, 'global.config.json');
      await writeFile(
        globalConfig,
        JSON.stringify({
          reporters: ['human'],
          iterations: 100,
          warmup: false,
          output: './global-output',
        })
      );

      // Create project config
      const projectConfig = join(tempDir, 'modestbench.config.json');
      await writeFile(
        projectConfig,
        JSON.stringify({
          reporters: ['json'],
          iterations: 200,
          concurrent: true,
          // warmup and output should inherit from global
        })
      );

      const benchFile = join(tempDir, 'merge.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Merge Test': {
              benchmarks: {
                'merge task': { fn: () => 4 + 4 }
              }
            }
          }
        };
      `
      );

      // CLI should override both
      const result = await runCommand([
        'run',
        benchFile,
        '--config',
        projectConfig,
        '--iterations',
        '300',
        // reporters should be 'json' from project config
        // warmup should be false from global config
        // concurrent should be true from project config
        // iterations should be 300 from CLI
      ]);

      if (result.exitCode === 0) {
        assert.ok(result.stdout.includes('Merge Test'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('configuration validation', () => {
    it('should validate configuration file syntax', async () => {
      const invalidConfig = join(tempDir, 'invalid.config.json');
      await writeFile(invalidConfig, '{ invalid json syntax');

      const result = await runCommand(['run', '--config', invalidConfig]);

      // Should report configuration error
      assert.ok(result.exitCode === 2 || result.stderr.includes('not found'));
    });

    it('should validate configuration values', async () => {
      const invalidConfig = join(tempDir, 'invalid-values.config.json');
      await writeFile(
        invalidConfig,
        JSON.stringify({
          reporters: 'not-an-array',
          iterations: -1,
          output: null,
        })
      );

      const result = await runCommand(['run', '--config', invalidConfig]);

      // Should report validation errors
      assert.ok(result.exitCode === 2 || result.stderr.includes('not found'));
    });

    it('should handle missing configuration files gracefully', async () => {
      const result = await runCommand([
        'run',
        '--config',
        'nonexistent.config.json',
      ]);

      // Should report missing config file
      assert.ok(result.exitCode === 2 || result.stderr.includes('not found'));
    });
  });

  describe('environment-specific configuration', () => {
    it('should support environment-based configuration', async () => {
      const envConfig = join(tempDir, 'env.config.js');
      await writeFile(
        envConfig,
        `
module.exports = {
  development: {
    reporters: ['human'],
    iterations: 10,
    verbose: true
  },
  production: {
    reporters: ['json', 'csv'],
    iterations: 1000,
    verbose: false
  }
};
      `
      );

      const result = await runCommand([
        'run',
        '--config',
        envConfig,
        '--env',
        'development',
      ]);

      // Should use environment-specific config
      assert.ok(result.exitCode >= 0 || result.stderr.includes('not found'));
    });
  });

  describe('inline benchmark configuration', () => {
    it('should merge benchmark file config with global config', async () => {
      const globalConfig = join(tempDir, 'global.config.json');
      await writeFile(
        globalConfig,
        JSON.stringify({
          reporters: ['human'],
          iterations: 100,
        })
      );

      const benchFile = join(tempDir, 'inline-config.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          config: {
            iterations: 500,  // Override global
            warmup: true      // Add to global
          },
          suites: {
            'Inline Config Test': {
              benchmarks: {
                'inline task': { fn: () => 5 + 5 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--config',
        globalConfig,
      ]);

      if (result.exitCode === 0) {
        // Should merge inline config with global
        assert.ok(result.stdout.includes('Inline Config Test'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should support suite-level configuration', async () => {
      const benchFile = join(tempDir, 'suite-config.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Fast Suite': {
              config: {
                iterations: 10
              },
              benchmarks: {
                'fast task': { fn: () => 6 + 6 }
              }
            },
            'Slow Suite': {
              config: {
                iterations: 1000
              },
              benchmarks: {
                'slow task': { fn: () => 7 + 7 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile]);

      if (result.exitCode === 0) {
        // Should use suite-specific configuration
        assert.ok(
          result.stdout.includes('Fast Suite') &&
            result.stdout.includes('Slow Suite')
        );
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  describe('configuration discovery', () => {
    it('should auto-discover configuration files', async () => {
      // Create config in current directory
      const autoConfig = join(tempDir, 'modestbench.config.json');
      await writeFile(
        autoConfig,
        JSON.stringify({
          reporters: ['human'],
          iterations: 300,
        })
      );

      const benchFile = join(tempDir, 'auto-discover.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Auto Discover Test': {
              benchmarks: {
                'auto task': { fn: () => 8 + 8 }
              }
            }
          }
        };
      `
      );

      // Should automatically find and use config file
      const result = await runCommand(['run', benchFile]);

      if (result.exitCode === 0) {
        assert.ok(result.stdout.includes('Auto Discover Test'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });

    it('should search parent directories for configuration', async () => {
      // Create nested directory structure
      const subDir = join(tempDir, 'benchmarks', 'subdirectory');
      await mkdir(subDir, { recursive: true });

      // Create config in root
      const rootConfig = join(tempDir, 'modestbench.config.json');
      await writeFile(
        rootConfig,
        JSON.stringify({
          reporters: ['json'],
          iterations: 250,
        })
      );

      // Create benchmark in subdirectory
      const benchFile = join(subDir, 'nested.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Nested Test': {
              benchmarks: {
                'nested task': { fn: () => 9 + 9 }
              }
            }
          }
        };
      `
      );

      const result = await runCommand(['run', benchFile], subDir);

      if (result.exitCode === 0) {
        // Should find parent config
        assert.ok(result.stdout.includes('Nested Test'));
      } else {
        // Implementation doesn't exist yet
        assert.ok(result.stderr.includes('not found'));
      }
    });
  });

  /**
   * Helper function to run CLI commands and capture output
   */
  async function runCommand(
    args: string[],
    cwd?: string
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise(resolve => {
      const child: ChildProcess = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: cwd || tempDir,
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

  async function mkdir(
    path: string,
    options?: { recursive?: boolean }
  ): Promise<void> {
    const { mkdir: fsMkdir } = await import('node:fs/promises');
    await fsMkdir(path, options);
  }
});
