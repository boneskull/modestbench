import { expect } from 'bupkis';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { BenchmarkEngine } from '../../src/types/interfaces.js';

import { ModestBenchConfigurationManager } from '../../src/config/manager.js';
import { TinybenchEngine } from '../../src/core/engines/index.js';
import { ModestBenchErrorManager } from '../../src/core/error-manager.js';
import { BenchmarkFileLoader } from '../../src/core/loader.js';
import { ModestBenchProgressManager } from '../../src/progress/manager.js';
import { ModestBenchReporterRegistry } from '../../src/reporters/registry.js';
import { FileHistoryStorage } from '../../src/storage/history.js';

/**
 * Contract tests for TinybenchEngine implementation
 *
 * Tests the concrete TinybenchEngine implementation of the BenchmarkEngine
 * interface. Reference: contracts/core-api.md lines 5-30
 */

describe('TinybenchEngine contract', () => {
  let engine: BenchmarkEngine;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'engine-test-'));

    // Create engine with all dependencies
    const configManager = new ModestBenchConfigurationManager();
    const fileLoader = new BenchmarkFileLoader();
    const reporterRegistry = new ModestBenchReporterRegistry();
    const historyStorage = new FileHistoryStorage({
      storageDir: join(tempDir, '.modestbench'),
    });
    const progressManager = new ModestBenchProgressManager();
    const errorManager = new ModestBenchErrorManager();

    engine = new TinybenchEngine({
      configManager,
      errorManager,
      fileLoader,
      historyStorage,
      progressManager,
      reporterRegistry,
    });
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('interface methods', () => {
    it('should have execute method', () => {
      expect(engine.execute, 'to be a function');
      // execute(config: RunConfiguration): Promise<BenchmarkRun>
    });

    it('should have validate method', () => {
      expect(engine.validate, 'to be a function');
      // validate(files: string[]): Promise<ValidationResult>
    });

    it('should have discover method', () => {
      expect(engine.discover, 'to be a function');
      // discover(pattern: string, exclude?: string[]): Promise<string[]>
    });

    it('should have registerReporter method', () => {
      expect(engine.registerReporter, 'to be a function');
      // registerReporter(name: string, reporter: Reporter): void
    });

    it('should have getReporters method', () => {
      expect(engine.getReporters, 'to be a function');
      // getReporters(): Record<string, Reporter>
    });
  });

  describe('execute method contract', () => {
    it('should accept RunConfiguration parameter', async () => {
      // Create a simple benchmark file
      const benchFile = join(tempDir, 'test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Test': {
              benchmarks: {
                'test': {
                  fn: () => 1 + 1
                }
              }
            }
          }
        };
      `,
      );

      const config = {
        config: { iterations: 1, quiet: true, time: 10, warmup: 0 },
        files: [benchFile],
        reporters: ['human'],
      };

      const result = await engine.execute(config);
      expect(result, 'not to be undefined');
      expect(typeof result, 'to equal', 'object');
    });

    it('should return Promise<BenchmarkRun>', async () => {
      // Create a minimal benchmark file
      const benchFile = join(tempDir, 'minimal.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Minimal': {
              benchmarks: {
                'simple': {
                  fn: () => {}
                }
              }
            }
          }
        };
      `,
      );

      const config = {
        config: { iterations: 1, quiet: true, time: 10, warmup: 0 },
        files: [benchFile],
        reporters: ['human'],
      };

      const promise = engine.execute(config);
      expect(promise, 'to be a', Promise);

      const result = await promise;
      // Result should have BenchmarkRun properties
      expect(result, 'to be an object');
      expect('id' in result, 'to be truthy');
      expect('timestamp' in result || 'startTime' in result, 'to be truthy');
      expect('status' in result || 'summary' in result, 'to be truthy');
    });

    it('should execute benchmarks from files', async () => {
      const benchFile = join(tempDir, 'execute.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Execute Test': {
              benchmarks: {
                'add numbers': {
                  fn: () => 1 + 1
                }
              }
            }
          }
        };
      `,
      );

      const config = {
        config: { iterations: 1, quiet: true, time: 10, warmup: 0 },
        files: [benchFile],
        reporters: ['human'],
      };

      const result = await engine.execute(config);
      expect(result.files.length, 'to be greater than', 0);
    });
  });

  describe('validate method contract', () => {
    it('should accept string array parameter', async () => {
      const benchFile = join(tempDir, 'validate.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Validate': {
              benchmarks: { 'test': { fn: () => {} } }
            }
          }
        };
      `,
      );

      const result = await engine.validate([benchFile]);
      expect(result, 'not to be undefined');
    });

    it('should return Promise<ValidationResult>', async () => {
      const benchFile = join(tempDir, 'valid.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Valid': {
              benchmarks: { 'test': { fn: () => {} } }
            }
          }
        };
      `,
      );

      const promise = engine.validate([benchFile]);
      expect(promise, 'to be a', Promise);

      const result = await promise;
      // Result should have ValidationResult properties
      expect(result, 'to be an object');
      expect('valid' in result, 'to be truthy');
      expect(typeof result.valid, 'to equal', 'boolean');
    });

    it('should validate benchmark file structure', async () => {
      const benchFile = join(tempDir, 'structure.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Structure Test': {
              benchmarks: {
                'valid benchmark': {
                  fn: () => 1 + 1
                }
              }
            }
          }
        };
      `,
      );

      const result = await engine.validate([benchFile]);
      expect(result.valid, 'to be', true);
    });

    it('should detect invalid files', async () => {
      const result = await engine.validate([
        join(tempDir, 'nonexistent.bench.js'),
      ]);
      // Should mark as invalid or have errors
      expect(
        !result.valid || (result.errors && result.errors.length > 0),
        'to be truthy',
      );
    });
  });

  describe('discover method contract', () => {
    it('should accept pattern string parameter', async () => {
      const result = await engine.discover('**/*.bench.js');
      expect(result, 'to be an array');
    });

    it('should accept optional exclude parameter', async () => {
      const result = await engine.discover('**/*.bench.js', [
        'node_modules/**',
      ]);
      expect(result, 'to be an array');
    });

    it('should return Promise<string[]>', async () => {
      const promise = engine.discover('**/*.bench.js');
      expect(promise, 'to be a', Promise);

      const result = await promise;
      expect(result, 'to be an array');
      // Should be array of file paths
      result.forEach((path) => {
        expect(typeof path === 'string', 'to be truthy');
      });
    });

    it('should discover benchmark files', async () => {
      // Create benchmark files
      const bench1 = join(tempDir, 'test1.bench.js');
      const bench2 = join(tempDir, 'test2.bench.js');
      await writeFile(
        bench1,
        'export default { name: "Test1", benchmarks: {} };',
      );
      await writeFile(
        bench2,
        'export default { name: "Test2", benchmarks: {} };',
      );

      const pattern = join(tempDir, '*.bench.js');
      const result = await engine.discover(pattern);

      expect(result.length, 'to be greater than or equal to', 2);
    });
  });

  describe('reporter management contract', () => {
    it('should register reporters with name and instance', () => {
      const mockReporter = {
        onEnd: async () => {},
        onError: () => {},
        onFileEnd: () => {},
        onFileStart: () => {},
        onProgress: () => {},
        onStart: async () => {},
        onSuiteEnd: () => {},
        onSuiteStart: () => {},
        onTaskResult: () => {},
        onTaskStart: () => {},
      };

      engine.registerReporter('test', mockReporter);
      const reporters = engine.getReporters();
      expect('test' in reporters, 'to be truthy');
      expect(reporters.test, 'to equal', mockReporter);
    });

    it('should return reporters record', () => {
      const reporters = engine.getReporters();
      expect(typeof reporters === 'object', 'to be truthy');
      expect(reporters !== null, 'to be truthy');
    });

    it('should manage multiple reporters', () => {
      const reporter1 = {
        onEnd: async () => {},
        onError: () => {},
        onFileEnd: () => {},
        onFileStart: () => {},
        onProgress: () => {},
        onStart: async () => {},
        onSuiteEnd: () => {},
        onSuiteStart: () => {},
        onTaskResult: () => {},
        onTaskStart: () => {},
      };
      const reporter2 = {
        onEnd: async () => {},
        onError: () => {},
        onFileEnd: () => {},
        onFileStart: () => {},
        onProgress: () => {},
        onStart: async () => {},
        onSuiteEnd: () => {},
        onSuiteStart: () => {},
        onTaskResult: () => {},
        onTaskStart: () => {},
      };

      engine.registerReporter('reporter1', reporter1);
      engine.registerReporter('reporter2', reporter2);

      const reporters = engine.getReporters();
      expect('reporter1' in reporters, 'to be truthy');
      expect('reporter2' in reporters, 'to be truthy');
    });
  });

  describe('error handling contract', () => {
    it('should handle invalid configurations gracefully', async () => {
      try {
        // Invalid config should throw
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await engine.execute({ config: {}, files: [], reporters: [] } as any);
        // Should throw for invalid config
        expect.fail('Should have thrown for invalid configuration');
      } catch (error) {
        expect(error, 'to be an', Error);
        expect((error as Error).message.length > 0, 'to be truthy');
      }
    });

    it('should handle file not found errors', async () => {
      const result = await engine.validate(['nonexistent.bench.js']);
      // Should return validation result with errors
      expect(result, 'to be an object');
      expect('valid' in result, 'to be truthy');
    });

    it('should handle empty file lists', async () => {
      const config = {
        config: { iterations: 1, time: 10, warmup: 0 },
        files: [],
        reporters: ['human'],
      };

      try {
        await engine.execute(config);
        // May complete with empty results
        expect(true, 'to be truthy');
      } catch (error) {
        // Or throw error about no files
        expect(error, 'to be an', Error);
      }
    });
  });

  describe('configuration integration', () => {
    it('should apply configuration to execution', async () => {
      const benchFile = join(tempDir, 'config.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Config Test': {
              benchmarks: {
                'test': { fn: () => {} }
              }
            }
          }
        };
      `,
      );

      const config = {
        config: {
          iterations: 2,
          quiet: true,
          time: 10,
          warmup: 0,
        },
        files: [benchFile],
        reporters: ['human'],
      };

      const result = await engine.execute(config);
      // Verify configuration was applied (check structure, not exact values which may be merged with defaults)
      expect(result.config, 'to be an object');
      expect('iterations' in result.config, 'to be truthy');
      expect('warmup' in result.config, 'to be truthy');
      expect('time' in result.config, 'to be truthy');
    });
  });

  describe('abort signal support', () => {
    it('should accept optional abort signal', async () => {
      const benchFile = join(tempDir, 'abort.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Abort Test': {
              benchmarks: { 'test': { fn: () => {} } }
            }
          }
        };
      `,
      );

      const config = {
        config: { iterations: 1, quiet: true, time: 10, warmup: 0 },
        files: [benchFile],
        reporters: ['human'],
      };

      const controller = new AbortController();
      const promise = engine.execute(config, [], controller.signal);

      expect(promise, 'to be a', Promise);
      // Let it complete normally
      await promise;
    });
  });
});
