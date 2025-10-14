/**
 * ModestBench Core Module Exports
 *
 * Main entry point for core components including the benchmark engine,
 * file loader, and error management system.
 */

export { ModestBenchEngine } from './engine.js';
// Re-export types that are commonly needed
export type { EngineDependencies } from './engine.js';
export { ModestBenchErrorManager } from './error-manager.js';

export { BenchmarkFileLoader } from './loader.js';
