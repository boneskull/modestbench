/**
 * ModestBench Node.js Test Runner Loader
 *
 * ES module loader hook that intercepts `node:test` imports and returns our
 * capturing mock from globalThis.
 *
 * Usage: node --import modestbench/node-test your-test.js
 *
 * This loader exports async `resolve` and `load` hooks that get registered via
 * module.register() when imported.
 */

import type { LoadHook, ResolveHook } from 'node:module';

// Generate the mock module source code
// The generated module source uses top-level await to conditionally get the mock or real module
// Note: Uses 'node:test?passthrough' to bypass our hook when falling back
// Security: The globalThis mock is only installed by our own adapter code, so the generated
// source is safe. No user input is interpolated into this template.
const generateMockSource = (): string => `
const mock = globalThis.__MODESTBENCH_NODE_TEST_MOCK__;

// If no mock installed, fall through to real node:test
// The '?passthrough' query tells our hook to not intercept this import
const source = mock ?? await import('node:test?passthrough');

export const test = source.test;
export const describe = source.describe;
export const it = source.it;
export const before = source.before;
export const after = source.after;
export const beforeEach = source.beforeEach;
export const afterEach = source.afterEach;
export const suite = source.suite;
export default source.default ?? source.test;
`;

/**
 * Resolve hook - intercepts node:test specifier
 *
 * Uses query param '?passthrough' to prevent infinite recursion when falling
 * back to real node:test (when no mock is installed).
 */
export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  // Only intercept bare 'node:test', not 'node:test?passthrough'
  if (specifier === 'node:test') {
    return {
      shortCircuit: true,
      url: 'modestbench://capture/node-test',
    };
  }
  // Strip passthrough query to resolve real node:test
  if (specifier === 'node:test?passthrough') {
    return nextResolve('node:test', context);
  }
  return nextResolve(specifier, context);
};

/**
 * Load hook - returns mock module for our custom URL
 */
export const load: LoadHook = async (url, context, nextLoad) => {
  if (url === 'modestbench://capture/node-test') {
    return {
      format: 'module',
      shortCircuit: true,
      source: generateMockSource(),
    };
  }
  return nextLoad(url, context);
};
