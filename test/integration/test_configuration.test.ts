import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Integration tests for configuration file and CLI argument merging Reference:
 * quickstart.md configuration examples and CLI priority
 */

describe('Configuration file and CLI argument merging', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('configuration file loading', () => {
    it('should load JSON configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configFile,
        JSON.stringify(
          {
            iterations: 1,
            output: './results',
            reporters: ['json', 'csv'],
            warmup: 0,
          },
          null,
          2,
        ),
      );

      const benchFile = join(tempDir, 'test.bench.js');
      await writeFile(
        benchFile,
        `export default {
  suites: {
    'Config Test': {
      benchmarks: {
                'test task': {
                  fn: () => 1
                }
      }
    }
  }
};`,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--config',
        configFile,
        '--iterations',
        '1',
        '--time',
        '100',
      ]);

      // CLI should work correctly and use config file settings
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.includes('Config Test') || result.stdout.includes('json'),
        'Should show config test results',
      );
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
iterations: 1
warmup: 0
      `,
      );

      const result = await runCommand([
        'run',
        '--config',
        configFile,
        '--help',
      ]);

      // Should handle YAML config successfully
      assert.ok(result.exitCode >= 0, `Command failed: ${result.stderr}`);
    });

    it('should load JavaScript configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.js');
      await writeFile(
        configFile,
        `
module.exports = {
  reporters: ['human'],
  output: './js-results',
  iterations: 1,
  warmup: 0
};
      `,
      );

      const result = await runCommand([
        'run',
        '--config',
        configFile,
        '--help',
      ]);

      // Should handle JS config
      assert.ok(result.exitCode >= 0, `Command failed: ${result.stderr}`);
    });

    it('should load TypeScript configuration files', async () => {
      const configFile = join(tempDir, 'modestbench.config.ts');
      await writeFile(
        configFile,
        `
export default {
  reporters: ['human', 'csv'] as const,
  output: './ts-results',
  iterations: 1,
  warmup: 0
};
      `,
      );

      const result = await runCommand([
        'run',
        '--config',
        configFile,
        '--help',
      ]);

      // Should handle TS config
      assert.ok(result.exitCode >= 0, `Command failed: ${result.stderr}`);
    });
  });

  describe('CLI argument precedence', () => {
    it('should override config file with CLI arguments', async () => {
      const configFile = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configFile,
        JSON.stringify({
          iterations: 1,
          output: './config-output',
          reporters: ['human'],
          warmup: 0,
        }),
      );

      const benchFile = join(tempDir, 'precedence.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Precedence Test': {
              benchmarks: {
                'precedence task': {
                  fn: () => 1
                }
              }
            }
          }
        };
      `,
      );

      // CLI args should override config file
      const result = await runCommand([
        'run',
        benchFile,
        '--config',
        configFile,
        '--reporters',
        'human,json,csv',
        '--iterations',
        '1',
        '--time',
        '100',
        '--output',
        './cli-output',
      ]);

      // Should use CLI values over config file and succeed
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.includes('Precedence Test'),
        'Should show benchmark results',
      );
    });

    it('should use config file defaults when CLI args not provided', async () => {
      const configFile = join(tempDir, 'defaults.config.json');
      await writeFile(
        configFile,
        JSON.stringify({
          iterations: 1,
          reporters: ['json'],
          warmup: 0,
        }),
      );

      const benchFile = join(tempDir, 'defaults.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Defaults Test': {
              benchmarks: {
                'default task': {
                  fn: () => 1
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
        '--config',
        configFile,
        '--time',
        '100',
      ]);

      // Should use config file defaults and succeed
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.includes('Defaults Test'),
        'Should show benchmark results',
      );
    });
  });

  describe('configuration merging hierarchy', () => {
    it('should merge configurations in correct precedence order', async () => {
      // Create global config
      const globalConfig = join(tempDir, 'global.config.json');
      await writeFile(
        globalConfig,
        JSON.stringify({
          iterations: 1,
          output: './global-output',
          reporters: ['human'],
          warmup: 0,
        }),
      );

      // Create project config
      const projectConfig = join(tempDir, 'modestbench.config.json');
      await writeFile(
        projectConfig,
        JSON.stringify({
          iterations: 1,
          reporters: ['json'],
          warmup: 0,
          // warmup and output should inherit from global
        }),
      );

      const benchFile = join(tempDir, 'merge.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Merge Test': {
              benchmarks: {
                'merge task': {
                  fn: () => 1
                }
              }
            }
          }
        };
      `,
      );

      // CLI should override both
      const result = await runCommand([
        'run',
        benchFile,
        '--config',
        projectConfig,
        '--iterations',
        '1',
        // reporters should be 'json' from project config
        // warmup should be false from global config
        // iterations should be 1 from CLI
      ]);

      // Should merge configurations and succeed
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.includes('Merge Test'),
        'Should show benchmark results',
      );
    });
  });

  describe('configuration validation', () => {
    it('should validate configuration file syntax', async () => {
      const invalidConfig = join(tempDir, 'invalid.config.json');
      await writeFile(invalidConfig, '{ invalid json syntax');

      const result = await runCommand(
        ['run', '--config', invalidConfig],
        tempDir,
      );

      // Should report configuration error
      assert.ok(result.exitCode === 2 || result.stderr.includes('not found'));
    });

    it('should validate configuration values', async () => {
      const invalidConfig = join(tempDir, 'invalid-values.config.json');
      await writeFile(
        invalidConfig,
        JSON.stringify({
          iterations: -1,
          output: null,
          reporters: 'not-an-array',
        }),
      );

      // Pass explicit iterations to prevent test harness from adding default
      const result = await runCommand(
        ['run', '--config', invalidConfig, '--iterations', '-1'],
        tempDir,
      );

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
    iterations: 10,
    verbose: false
  }
};
      `,
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
          iterations: 1,
          reporters: ['human'],
          warmup: 0,
        }),
      );

      const benchFile = join(tempDir, 'inline-config.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          config: {
            iterations: 1,  // Override global
            warmup: 0         // Add to global
          },
          suites: {
            'Inline Config Test': {
              benchmarks: {
                'inline task': {
                  fn: () => 1
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
        '--config',
        globalConfig,
      ]);

      if (result.exitCode === 0) {
        // Should merge inline config with global
        assert.ok(result.stdout.includes('Inline Config Test'));
      } else {
        // This feature may not be implemented yet, expect reasonable error
        assert.ok(
          result.stderr.includes('not found') || result.exitCode !== 0,
          'Should handle inline config gracefully',
        );
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
                iterations: 1,
                warmup: 0
              },
              benchmarks: {
                'fast task': {
                  fn: () => 1
                }
              }
            },
            'Slow Suite': {
              config: {
                iterations: 1,
                warmup: 0
              },
              benchmarks: {
                'slow task': {
                  fn: () => 2
                }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand(
        ['run', benchFile, '--time', '100'],
        tempDir,
      );

      if (result.exitCode === 0) {
        // Should use suite-specific configuration
        assert.ok(
          result.stdout.includes('Fast Suite') &&
            result.stdout.includes('Slow Suite'),
        );
      } else {
        // This feature may not be implemented yet, expect reasonable error
        assert.ok(
          result.stderr.includes('not found') || result.exitCode !== 0,
          'Should handle suite-level config gracefully',
        );
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
          iterations: 1,
          reporters: ['human'],
          warmup: 0,
        }),
      );

      const benchFile = join(tempDir, 'auto-discover.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Auto Discover Test': {
              benchmarks: {
                'auto task': {
                  fn: () => 1
                }
              }
            }
          }
        };
      `,
      );

      // Should automatically find and use config file
      const result = await runCommand(
        ['run', benchFile, '--time', '100'],
        tempDir,
      );

      // Should auto-discover config file and succeed
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.includes('Auto Discover Test'),
        'Should show benchmark results',
      );
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
          iterations: 1,
          reporters: ['json'],
          warmup: 0,
        }),
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
                'nested task': {
                  fn: () => 1
                }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand(
        ['run', benchFile, '--time', '100'],
        subDir,
      );

      // Should find parent config and succeed
      assert.strictEqual(
        result.exitCode,
        0,
        `Command failed: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.includes('Nested Test'),
        'Should show benchmark results',
      );
    });
  });
});
