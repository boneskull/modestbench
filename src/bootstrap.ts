/**
 * Provides {@link bootstrap} function to initialize the ModestBench engine with
 * default dependencies.
 *
 * @packageDocumentation
 */

import { type ModestBenchEngine } from './core/engine.js';
import { TinybenchEngine } from './core/engines/index.js';
import { ModestBenchConfigurationManager } from './services/config-manager.js';
import { BenchmarkFileLoader } from './services/file-loader.js';
import { FileHistoryStorage } from './services/history-storage.js';
import { ModestBenchProgressManager } from './services/progress-manager.js';
import { ModestBenchReporterRegistry } from './services/reporter-registry.js';

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
    fileLoader: new BenchmarkFileLoader(),
    historyStorage: new FileHistoryStorage(),
    progressManager: new ModestBenchProgressManager(),
    reporterRegistry: new ModestBenchReporterRegistry(),
  });
  return engine;
};
