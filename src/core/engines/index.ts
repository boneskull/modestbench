/**
 * Benchmark Engine Implementations
 *
 * Concrete implementations of the ModestBenchEngine abstract class using
 * different underlying benchmark libraries.
 *
 * Available engines:
 *
 * - TinybenchEngine: Default engine using tinybench library
 * - AccurateEngine: High-accuracy engine with V8 optimization guards
 *
 * @packageDocumentation
 */

export { AccurateEngine } from './accurate-engine.js';
export { TinybenchEngine } from './tinybench-engine.js';
