import { expect } from 'bupkis';
import { dirname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { ReporterContext } from '../../../src/types/index.js';

import {
  ReporterLoadError,
  ReporterValidationError,
} from '../../../src/errors/reporter.js';
import {
  createReporterContext,
  isBuiltInReporter,
  isFilePath,
  loadReporter,
  PLUGIN_API_VERSION,
} from '../../../src/services/reporter-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '..', '..', 'fixtures', 'reporters');

describe('reporter-loader', () => {
  describe('PLUGIN_API_VERSION', () => {
    it('should be a positive integer', () => {
      expect(PLUGIN_API_VERSION, 'to be a', 'number');
      expect(PLUGIN_API_VERSION, 'to be greater than', 0);
      expect(Number.isInteger(PLUGIN_API_VERSION), 'to be', true);
    });
  });

  describe('createReporterContext()', () => {
    it('should return a ReporterContext object', () => {
      const context = createReporterContext();

      expect(context, 'to be an', 'object');
      expect(context.pluginApiVersion, 'to be', PLUGIN_API_VERSION);
      expect(context.version, 'to be a', 'string');
      expect(context.utils, 'to be an', 'object');
      expect(context.logger, 'to be an', 'object');
    });

    it('should include a logger with all log levels', () => {
      const context = createReporterContext();

      expect(context.logger.debug, 'to be a', 'function');
      expect(context.logger.info, 'to be a', 'function');
      expect(context.logger.warn, 'to be a', 'function');
      expect(context.logger.error, 'to be a', 'function');
      expect(context.logger.trace, 'to be a', 'function');
    });

    it('should include formatting utilities', () => {
      const context = createReporterContext();

      expect(context.utils.formatDuration, 'to be a', 'function');
      expect(context.utils.formatOpsPerSecond, 'to be a', 'function');
      expect(context.utils.formatPercentage, 'to be a', 'function');
      expect(context.utils.formatBytes, 'to be a', 'function');
    });

    it('should have working formatDuration utility', () => {
      const context = createReporterContext();

      expect(context.utils.formatDuration(1_000_000), 'to equal', '1.00ms');
    });

    it('should have working formatOpsPerSecond utility', () => {
      const context = createReporterContext();

      expect(
        context.utils.formatOpsPerSecond(1_000_000),
        'to equal',
        '1.00M ops/sec',
      );
    });

    it('should have working formatPercentage utility', () => {
      const context = createReporterContext();

      expect(context.utils.formatPercentage(12.345), 'to equal', '12.35%');
    });

    it('should have working formatBytes utility', () => {
      const context = createReporterContext();

      expect(context.utils.formatBytes(1024), 'to equal', '1.0 KB');
    });
  });

  describe('isBuiltInReporter()', () => {
    it('should return true for built-in reporter names', () => {
      expect(isBuiltInReporter('human'), 'to be', true);
      expect(isBuiltInReporter('json'), 'to be', true);
      expect(isBuiltInReporter('csv'), 'to be', true);
      expect(isBuiltInReporter('simple'), 'to be', true);
      expect(isBuiltInReporter('nyan'), 'to be', true);
    });

    it('should return false for non-built-in reporter names', () => {
      expect(isBuiltInReporter('custom'), 'to be', false);
      expect(isBuiltInReporter('./my-reporter.js'), 'to be', false);
      expect(isBuiltInReporter('@company/reporter'), 'to be', false);
    });
  });

  describe('isFilePath()', () => {
    it('should return true for relative paths starting with ./', () => {
      expect(isFilePath('./my-reporter.js'), 'to be', true);
      expect(isFilePath('./reporters/custom.js'), 'to be', true);
    });

    it('should return true for relative paths starting with ../', () => {
      expect(isFilePath('../my-reporter.js'), 'to be', true);
      expect(isFilePath('../../reporters/custom.js'), 'to be', true);
    });

    it('should return true for absolute paths', () => {
      expect(isFilePath('/usr/local/lib/reporter.js'), 'to be', true);
      expect(isFilePath('/home/user/reporters/custom.js'), 'to be', true);
    });

    it('should return false for npm package names', () => {
      expect(isFilePath('modestbench-reporter-custom'), 'to be', false);
      expect(isFilePath('@company/reporter'), 'to be', false);
      expect(isFilePath('some-package'), 'to be', false);
    });
  });

  describe('loadReporter()', () => {
    describe('plain object reporters', () => {
      it('should load a plain object reporter', async () => {
        const specifier = join(fixturesDir, 'plain-object-reporter.ts');
        const reporter = await loadReporter(specifier);

        expect(reporter, 'to be an', 'object');
        expect(reporter.onStart, 'to be a', 'function');
        expect(reporter.onEnd, 'to be a', 'function');
        expect(reporter.onError, 'to be a', 'function');
        expect(reporter.onTaskResult, 'to be a', 'function');
      });

      it('should load a reporter with optional methods', async () => {
        const specifier = join(
          fixturesDir,
          'with-optional-methods-reporter.ts',
        );
        const reporter = await loadReporter(specifier);

        expect(reporter.onFileStart, 'to be a', 'function');
        expect(reporter.onFileEnd, 'to be a', 'function');
        expect(reporter.onSuiteStart, 'to be a', 'function');
        expect(reporter.onSuiteEnd, 'to be a', 'function');
        expect(reporter.onSuiteInit, 'to be a', 'function');
        expect(reporter.onTaskStart, 'to be a', 'function');
        expect(reporter.onProgress, 'to be a', 'function');
        expect(reporter.onBudgetResult, 'to be a', 'function');
      });
    });

    describe('class-based reporters', () => {
      it('should instantiate a class reporter', async () => {
        const specifier = join(fixturesDir, 'class-reporter.ts');
        const reporter = await loadReporter(specifier);

        expect(reporter, 'to be an', 'object');
        expect(reporter.onStart, 'to be a', 'function');
        expect(
          (reporter as unknown as { options: unknown }).options,
          'to be an',
          'object',
        );
        expect(
          (reporter as unknown as { context: unknown }).context,
          'to be an',
          'object',
        );
      });

      it('should pass options to class constructor', async () => {
        const specifier = join(fixturesDir, 'class-reporter.ts');
        const options = { format: 'markdown', verbose: true };
        const reporter = (await loadReporter(
          specifier,
          options,
        )) as unknown as {
          options: Record<string, unknown>;
        };

        expect(reporter.options, 'to equal', options);
      });

      it('should pass context to class constructor', async () => {
        const specifier = join(fixturesDir, 'class-reporter.ts');
        const reporter = (await loadReporter(specifier)) as unknown as {
          context: ReporterContext;
        };

        expect(reporter.context.pluginApiVersion, 'to be', PLUGIN_API_VERSION);
        expect(reporter.context.version, 'to be a', 'string');
        expect(reporter.context.utils, 'to be an', 'object');
      });
    });

    describe('factory function reporters', () => {
      it('should call a sync factory function', async () => {
        const specifier = join(fixturesDir, 'factory-reporter.ts');
        const reporter = await loadReporter(specifier);

        expect(reporter, 'to be an', 'object');
        expect(reporter.onStart, 'to be a', 'function');
        expect(
          (reporter as unknown as { receivedOptions: unknown }).receivedOptions,
          'to be an',
          'object',
        );
        expect(
          (reporter as unknown as { receivedContext: unknown }).receivedContext,
          'to be an',
          'object',
        );
      });

      it('should pass options to factory function', async () => {
        const specifier = join(fixturesDir, 'factory-reporter.ts');
        const options = { apiKey: 'secret', endpoint: 'https://example.com' };
        const reporter = (await loadReporter(
          specifier,
          options,
        )) as unknown as {
          receivedOptions: Record<string, unknown>;
        };

        expect(reporter.receivedOptions, 'to equal', options);
      });

      it('should pass context to factory function', async () => {
        const specifier = join(fixturesDir, 'factory-reporter.ts');
        const reporter = (await loadReporter(specifier)) as unknown as {
          receivedContext: ReporterContext;
        };

        expect(
          reporter.receivedContext.pluginApiVersion,
          'to be',
          PLUGIN_API_VERSION,
        );
        expect(reporter.receivedContext.version, 'to be a', 'string');
        expect(
          reporter.receivedContext.utils.formatDuration,
          'to be a',
          'function',
        );
      });
    });

    describe('async factory function reporters', () => {
      it('should await an async factory function', async () => {
        const specifier = join(fixturesDir, 'async-factory-reporter.ts');
        const reporter = (await loadReporter(specifier)) as unknown as {
          asyncInitialized: boolean;
        };

        expect(reporter, 'to be an', 'object');
        expect(reporter.asyncInitialized, 'to be', true);
      });

      it('should pass options to async factory', async () => {
        const specifier = join(fixturesDir, 'async-factory-reporter.ts');
        const options = { connectionString: 'postgres://localhost:5432/db' };
        const reporter = (await loadReporter(
          specifier,
          options,
        )) as unknown as {
          receivedOptions: Record<string, unknown>;
        };

        expect(reporter.receivedOptions, 'to equal', options);
      });
    });

    describe('relative path resolution', () => {
      it('should resolve relative paths from cwd', async () => {
        const cwd = fixturesDir;
        const reporter = await loadReporter(
          './plain-object-reporter.ts',
          {},
          cwd,
        );

        expect(reporter, 'to be an', 'object');
        expect(reporter.onStart, 'to be a', 'function');
      });
    });

    describe('error handling', () => {
      it('should throw ReporterLoadError for non-existent file', async () => {
        const specifier = join(fixturesDir, 'does-not-exist.ts');

        let errorThrown = false;
        try {
          await loadReporter(specifier);
        } catch (error) {
          errorThrown = true;
          expect(error, 'to be a', ReporterLoadError);
        }
        expect(errorThrown, 'to be', true);
      });

      it('should include specifier in ReporterLoadError', async () => {
        const specifier = join(fixturesDir, 'does-not-exist.ts');

        try {
          await loadReporter(specifier);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error, 'to be a', ReporterLoadError);
          expect((error as ReporterLoadError).specifier, 'to be', specifier);
        }
      });

      it('should throw ReporterValidationError for missing methods', async () => {
        const specifier = join(fixturesDir, 'missing-methods-reporter.ts');

        let errorThrown = false;
        try {
          await loadReporter(specifier);
        } catch (error) {
          errorThrown = true;
          expect(error, 'to be a', ReporterValidationError);
        }
        expect(errorThrown, 'to be', true);
      });

      it('should list missing methods in ReporterValidationError', async () => {
        const specifier = join(fixturesDir, 'missing-methods-reporter.ts');

        try {
          await loadReporter(specifier);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error, 'to be a', ReporterValidationError);
          const validationError = error as ReporterValidationError;
          expect(validationError.missingMethods, 'to deeply equal', [
            'onError',
            'onTaskResult',
          ]);
        }
      });

      it('should throw ReporterValidationError for invalid export type', async () => {
        const specifier = join(fixturesDir, 'invalid-export-reporter.ts');

        let errorThrown = false;
        try {
          await loadReporter(specifier);
        } catch (error) {
          errorThrown = true;
          expect(error, 'to be a', ReporterValidationError);
        }
        expect(errorThrown, 'to be', true);
      });

      it('should throw ReporterLoadError when constructor throws', async () => {
        const specifier = join(fixturesDir, 'throwing-constructor-reporter.ts');

        let errorThrown = false;
        try {
          await loadReporter(specifier);
        } catch (error) {
          errorThrown = true;
          expect(error, 'to be a', ReporterLoadError);
          expect(
            (error as ReporterLoadError).message,
            'to contain',
            'Constructor threw error',
          );
          expect(
            (error as ReporterLoadError).message,
            'to contain',
            'Constructor explosion!',
          );
        }
        expect(errorThrown, 'to be', true);
      });

      it('should throw ReporterLoadError when factory throws', async () => {
        const specifier = join(fixturesDir, 'throwing-factory-reporter.ts');

        let errorThrown = false;
        try {
          await loadReporter(specifier);
        } catch (error) {
          errorThrown = true;
          expect(error, 'to be a', ReporterLoadError);
          expect(
            (error as ReporterLoadError).message,
            'to contain',
            'Factory function threw error',
          );
          expect(
            (error as ReporterLoadError).message,
            'to contain',
            'Factory explosion!',
          );
        }
        expect(errorThrown, 'to be', true);
      });

      it('should handle named exports as fallback (module object)', async () => {
        // When there's no default export, the module object itself becomes the export
        // This should fail validation since the module object has 'reporter' property,
        // not the required methods
        const specifier = join(fixturesDir, 'named-export-reporter.ts');

        let errorThrown = false;
        try {
          await loadReporter(specifier);
        } catch (error) {
          errorThrown = true;
          expect(error, 'to be a', ReporterValidationError);
        }
        expect(errorThrown, 'to be', true);
      });
    });

    describe('default options', () => {
      it('should use empty object as default options', async () => {
        const specifier = join(fixturesDir, 'factory-reporter.ts');
        const reporter = (await loadReporter(specifier)) as unknown as {
          receivedOptions: Record<string, unknown>;
        };

        expect(reporter.receivedOptions, 'to satisfy', {});
        expect(Object.keys(reporter.receivedOptions), 'to have length', 0);
      });
    });
  });
});
