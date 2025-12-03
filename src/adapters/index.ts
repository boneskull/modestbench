/**
 * ModestBench Test Framework Adapters
 *
 * Provides adapters for capturing test definitions from various test frameworks
 * and converting them to modestbench benchmark format.
 *
 * Supported frameworks:
 *
 * - Mocha: globals-based capture (describe, it, hooks)
 * - Node:test: ES module loader hook
 * - AVA: ES module loader hook
 */

export { AvaAdapter } from './ava-adapter.js';
export { MochaAdapter } from './mocha-adapter.js';
export { NodeTestAdapter } from './node-test-adapter.js';

export type {
  CapturedSuite,
  CapturedTest,
  CapturedTestFile,
  ConversionOptions,
  ConvertedBenchmarkSuite,
  SuiteHooks,
  TestFramework,
  TestFrameworkAdapter,
} from './types.js';

export { capturedToBenchmark } from './types.js';
