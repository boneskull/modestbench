/**
 * Provides {@link bootstrap} function to initialize the ModestBench engine with
 * default dependencies.
 *
 * @packageDocumentation
 */

import { ModestBenchConfigurationManager } from './config/manager.js';
import { type ModestBenchEngine } from './core/engine.js';
import { TinybenchEngine } from './core/engines/index.js';
import { ModestBenchErrorManager } from './core/error-manager.js';
import { BenchmarkFileLoader } from './core/loader.js';
import { ModestBenchProgressManager } from './progress/manager.js';
import { ModestBenchReporterRegistry } from './reporters/registry.js';
import { FileHistoryStorage } from './storage/history.js';

/**
 * Initializes the ModestBench engine with default dependencies.
 *
 * Uses TinybenchEngine as the default concrete implementation.
 *
 * @returns {ModestBenchEngine} The initialized ModestBench engine.
 * @public
 */
export const bootstrap = (): ModestBenchEngine => {
  const engine = new TinybenchEngine({
    configManager: new ModestBenchConfigurationManager(),
    errorManager: new ModestBenchErrorManager(),
    fileLoader: new BenchmarkFileLoader(),
    historyStorage: new FileHistoryStorage(),
    progressManager: new ModestBenchProgressManager(),
    reporterRegistry: new ModestBenchReporterRegistry(),
  });
  return engine;
};
