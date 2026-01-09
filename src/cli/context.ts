/**
 * CLI Context
 *
 * Provides dependency injection container for CLI commands, including
 * configuration manager, benchmark engine, history storage, and reporters.
 *
 * @packageDocumentation
 */

import type { InferParserValues } from '@boneskull/bargs';

import type {
  BenchmarkEngine,
  ConfigurationManager,
  Engine,
  HistoryStorage,
  ProgressManager,
  ReporterRegistry,
} from '../types/index.js';
import type { globalOptions } from './parsers/global.js';

import { bootstrap } from '../bootstrap.js';
import { DEFAULT_ENGINE, Engines, ExitCodes, Reporters } from '../constants.js';
import { AccurateEngine, TinybenchEngine } from '../core/engines/index.js';
import {
  CsvReporter,
  HumanReporter,
  JsonReporter,
  NyanReporter,
  SimpleReporter,
} from '../reporters/index.js';

/**
 * CLI context with initialized services
 */
export interface CliContext {
  readonly abortController: AbortController;
  readonly configManager: ConfigurationManager;
  readonly engine: BenchmarkEngine;
  readonly historyStorage: HistoryStorage;
  readonly options: InferParserValues<typeof globalOptions>;
  readonly progressManager: ProgressManager;
  readonly reporterRegistry: ReporterRegistry;
}

/**
 * Create CLI context with dependency injection
 */
export const createCliContext = async (
  options: InferParserValues<typeof globalOptions>,
  abortController: AbortController,
  engineType: Engine = DEFAULT_ENGINE,
): Promise<CliContext> => {
  try {
    const dependencies = bootstrap();

    // Select engine based on type
    const engine =
      engineType === Engines.ACCURATE
        ? new AccurateEngine(dependencies)
        : new TinybenchEngine(dependencies);

    // Register built-in reporters
    engine.registerReporter(
      Reporters.HUMAN,
      new HumanReporter({
        color: !options['no-color'],
        verbose: options.verbose,
      }),
    );

    engine.registerReporter(
      'json',
      new JsonReporter({
        prettyPrint: false,
      }),
    );

    engine.registerReporter(
      'csv',
      new CsvReporter({
        includeHeaders: true,
        includeMetadata: true,
      }),
    );

    engine.registerReporter(
      'simple',
      new SimpleReporter({
        verbose: options.verbose,
      }),
    );

    engine.registerReporter(
      'nyan',
      new NyanReporter({
        color: !options['no-color'],
      }),
    );

    return {
      abortController,
      configManager: engine.configManager,
      engine,
      historyStorage: engine.historyStorage,
      options,
      progressManager: engine.progressManager,
      reporterRegistry: engine.reporterRegistry,
    };
  } catch (error) {
    console.error(
      'Failed to initialize ModestBench:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(ExitCodes.CONFIG_ERROR);
  }
};
