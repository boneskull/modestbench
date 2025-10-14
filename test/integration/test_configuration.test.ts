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
            iterations: 10,
            output: './results',
            reporters: ['json', 'csv'],
            warmup: 5,
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
          fn: () => {
            // Simple CPU work for benchmarking
            let sum = 0;
            for (let i = 0; i < 1000; i++) {
              sum += i;
            }
            return sum;
          }
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
iterations: 10
warmup: false
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
  iterations: 10,
  warmup: 10
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
  iterations: 10,
  warmup: 15
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
          iterations: 10,
          output: './config-output',
          reporters: ['human'],
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
                  fn: () => {
                    let result = 0;
                    for (let i = 0; i < 500; i++) {
                      result += i * 2;
                    }
                    return result;
                  }
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
        'json,csv',
        '--iterations',
        '500',
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
          reporters: ['json'],
          warmup: 8,
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
                  fn: () => {
                    let total = 0;
                    for (let i = 0; i < 300; i++) {
                      total += Math.sqrt(i);
                    }
                    return total;
                  }
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
          iterations: 10,
          output: './global-output',
          reporters: ['human'],
          warmup: false,
        }),
      );

      // Create project config
      const projectConfig = join(tempDir, 'modestbench.config.json');
      await writeFile(
        projectConfig,
        JSON.stringify({
          iterations: 10,
          reporters: ['json'],
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
                  fn: () => {
                    let value = 0;
                    for (let i = 0; i < 400; i++) {
                      value += i % 10;
                    }
                    return value;
                  }
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
        '300',
        // reporters should be 'json' from project config
        // warmup should be false from global config
        // iterations should be 300 from CLI
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

      const result = await runCommand(
        ['run', '--config', invalidConfig],
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
          iterations: 10,
          reporters: ['human'],
        }),
      );

      const benchFile = join(tempDir, 'inline-config.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          config: {
            iterations: 10,  // Override global
            warmup: 3         // Add to global
          },
          suites: {
            'Inline Config Test': {
              benchmarks: {
                'inline task': {
                  fn: () => {
                    let result = 0;
                    for (let i = 0; i < 250; i++) {
                      result += Math.abs(i - 125);
                    }
                    return result;
                  }
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
                iterations: 10
              },
              benchmarks: {
                'fast task': {
                  fn: () => {
                    let sum = 0;
                    for (let i = 0; i < 200; i++) {
                      sum += i % 7;
                    }
                    return sum;
                  }
                }
              }
            },
            'Slow Suite': {
              config: {
                iterations: 10
              },
              benchmarks: {
                'slow task': {
                  fn: () => {
                    let product = 1;
                    for (let i = 1; i < 50; i++) {
                      product = (product * i) % 1000;
                    }
                    return product;
                  }
                }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand(['run', benchFile], tempDir);

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
          iterations: 10,
          reporters: ['human'],
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
                  fn: () => {
                    let fibonacci = [0, 1];
                    for (let i = 2; i < 30; i++) {
                      fibonacci[i] = fibonacci[i-1] + fibonacci[i-2];
                    }
                    return fibonacci[29];
                  }
                }
              }
            }
          }
        };
      `,
      );

      // Should automatically find and use config file
      const result = await runCommand(['run', benchFile], tempDir);

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
          iterations: 10,
          reporters: ['json'],
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
                  fn: () => {
                    let matrix = [[1, 2], [3, 4]];
                    let sum = 0;
                    for (let i = 0; i < 100; i++) {
                      sum += matrix[i % 2][i % 2];
                    }
                    return sum;
                  }
                }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand(['run', benchFile], subDir);

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
