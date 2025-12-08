/**
 * ModestBench AVA Loader Hooks
 *
 * ES module loader hooks that intercept `ava` imports and return our capturing
 * mock from globalThis.
 *
 * Usage: node --import modestbench/ava test-file.js
 *
 * This loader exports async `resolve` and `load` hooks that get registered via
 * module.register() when imported through ava-register.ts.
 */

import type { LoadHook, ResolveHook } from 'node:module';

/**
 * Generate the mock module source code
 *
 * Uses top-level await to conditionally get mock or real module. Note: Uses
 * 'ava?passthrough' to bypass our hook when falling back.
 */
const generateMockSource = (): string => `
const mock = globalThis.__MODESTBENCH_AVA_MOCK__;

// If no mock installed, fall through to real ava
// The '?passthrough' query tells our hook to not intercept this import
const source = mock ?? await import('ava?passthrough');

export const test = source.test ?? source.default;
export default source.default ?? source.test;
`;

/**
 * Resolve hook - intercepts ava specifier
 *
 * Uses query param '?passthrough' to prevent infinite recursion when falling
 * back to real ava (when no mock is installed).
 */
export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  // Only intercept bare 'ava', not 'ava?passthrough'
  if (specifier === 'ava') {
    return {
      shortCircuit: true,
      url: 'modestbench://capture/ava',
    };
  }
  // Strip passthrough query to resolve real ava
  if (specifier === 'ava?passthrough') {
    return nextResolve('ava', context);
  }
  return nextResolve(specifier, context);
};

/**
 * Load hook - returns mock module for our custom URL
 */
export const load: LoadHook = async (url, context, nextLoad) => {
  if (url === 'modestbench://capture/ava') {
    return {
      format: 'module',
      shortCircuit: true,
      source: generateMockSource(),
    };
  }
  return nextLoad(url, context);
};
