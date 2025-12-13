/**
 * ModestBench Jest Loader Hooks
 *
 * ES module loader hooks that intercept `@jest/globals` imports and return our
 * capturing mock from globalThis.
 *
 * Usage: node --import modestbench/jest test-file.js
 *
 * This loader exports async `resolve` and `load` hooks that get registered via
 * module.register() when imported through jest-register.ts.
 */

import type { LoadHook, ResolveHook } from 'node:module';

/**
 * Generate the mock module source code
 *
 * Uses top-level await to conditionally get mock or real module. Note: Uses
 * '@jest/globals?passthrough' to bypass our hook when falling back.
 *
 * Security: The globalThis mock is only installed by our own adapter code, so
 * the generated source is safe. No user input is interpolated into this
 * template.
 */
const generateMockSource = (): string => `
const mock = globalThis.__MODESTBENCH_JEST_MOCK__;

// If no mock installed, fall through to real @jest/globals
// The '?passthrough' query tells our hook to not intercept this import
const source = mock ?? await import('@jest/globals?passthrough');

export const describe = source.describe;
export const fdescribe = source.fdescribe ?? source.describe?.only;
export const xdescribe = source.xdescribe ?? source.describe?.skip;
export const test = source.test;
export const it = source.it ?? source.test;
export const fit = source.fit ?? source.test?.only;
export const xit = source.xit ?? source.test?.skip;
export const xtest = source.xtest ?? source.test?.skip;
export const expect = source.expect;
export const jest = source.jest;
export const beforeAll = source.beforeAll;
export const afterAll = source.afterAll;
export const beforeEach = source.beforeEach;
export const afterEach = source.afterEach;
export default source;
`;

/**
 * Resolve hook - intercepts @jest/globals specifier
 *
 * Uses query param '?passthrough' to prevent infinite recursion when falling
 * back to real @jest/globals (when no mock is installed).
 */
export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  // Only intercept bare '@jest/globals', not '@jest/globals?passthrough'
  if (specifier === '@jest/globals') {
    return {
      shortCircuit: true,
      url: 'modestbench://capture/jest',
    };
  }
  // Strip passthrough query to resolve real @jest/globals
  if (specifier === '@jest/globals?passthrough') {
    return nextResolve('@jest/globals', context);
  }
  return nextResolve(specifier, context);
};

/**
 * Load hook - returns mock module for our custom URL
 */
export const load: LoadHook = async (url, context, nextLoad) => {
  if (url === 'modestbench://capture/jest') {
    return {
      format: 'module',
      shortCircuit: true,
      source: generateMockSource(),
    };
  }
  return nextLoad(url, context);
};
