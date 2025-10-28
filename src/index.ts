/**
 * ModestBench Public API
 *
 * Main entry point for programmatic usage of ModestBench. This module exports
 * all core classes, utilities, and types needed to use ModestBench as a
 * library.
 */

export { bootstrap as modestbench } from './bootstrap.js';

// Core engine
export { ModestBenchEngine } from './core/engine.js';
export { AccurateEngine, TinybenchEngine } from './core/engines/index.js';

// Statistical utilities
export {
  calculateStatistics,
  removeOutliersIQR,
  type SampleStatistics,
} from './core/stats-utils.js';

// Error classes
export * from './errors/index.js';

// Reporters
export { CsvReporter } from './reporters/csv.js';
export { HumanReporter } from './reporters/human.js';
export { JsonReporter } from './reporters/json.js';
export { ProfileHumanReporter } from './reporters/profile-human.js';

// Services
export { ModestBenchConfigurationManager } from './services/config-manager.js';
export { BenchmarkFileLoader } from './services/file-loader.js';
export { FileHistoryStorage } from './services/history-storage.js';
// Profiler services
export { filterProfile } from './services/profiler/profile-filter.js';
export { parseProfile } from './services/profiler/profile-parser.js';

export { runWithProfiling } from './services/profiler/profile-runner.js';
export { ModestBenchProgressManager } from './services/progress-manager.js';
export {
  BaseReporter,
  CompositeReporter,
  ModestBenchReporterRegistry,
} from './services/reporter-registry.js';

// Export all types
export * from './types/index.js';

// Utilities
export { findPackageRoot } from './utils/package.js';
