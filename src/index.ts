/**
 * ModestBench Public API
 *
 * Main entry point for programmatic usage of ModestBench. This module exports
 * all core classes, utilities, and types needed to use ModestBench as a
 * library.
 */

export { bootstrap as modestbench } from './bootstrap.js';
// Configuration management
export { ModestBenchConfigurationManager } from './config/manager.js';

// Core engine and loader
export { ModestBenchEngine } from './core/engine.js';

// Error handling
export { ModestBenchErrorManager } from './core/error-manager.js';

export { BenchmarkFileLoader } from './core/loader.js';

// Progress tracking
export { ModestBenchProgressManager } from './progress/manager.js';
// Reporters
export { CsvReporter } from './reporters/csv.js';
export { HumanReporter } from './reporters/human.js';
export { JsonReporter } from './reporters/json.js';

export {
  BaseReporter,
  CompositeReporter,
  ModestBenchReporterRegistry,
} from './reporters/registry.js';

// Storage
export { FileHistoryStorage } from './storage/history.js';

// Export all types
export * from './types/index.js';
