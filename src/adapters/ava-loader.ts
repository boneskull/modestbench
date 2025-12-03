/**
 * ModestBench AVA Loader
 *
 * ES module loader hook that intercepts `ava` imports and returns our capturing
 * mock from globalThis.
 *
 * Usage: node --import ./ava-loader.mjs test-file.js
 *
 * This loader works in conjunction with AvaAdapter, which installs the mock on
 * globalThis.**MODESTBENCH_AVA_MOCK** before loading test files.
 */

import { type LoadHook, type ResolveHook } from 'node:module';

/**
 * ESM loader resolve hook - intercepts ava specifier
 */
export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  if (specifier === 'ava') {
    // Return a custom URL that our load hook will handle
    return {
      shortCircuit: true,
      url: 'modestbench://capture/ava',
    };
  }

  return nextResolve(specifier, context);
};

/**
 * ESM loader load hook - returns mock module for our custom URL
 */
export const load: LoadHook = async (url, context, nextLoad) => {
  if (url === 'modestbench://capture/ava') {
    // Generate source code that re-exports from the global mock
    // The mock is installed by AvaAdapter before this runs
    const source = `
      const mock = globalThis.__MODESTBENCH_AVA_MOCK__;

      if (!mock) {
        throw new Error(
          'modestbench: AVA mock not installed. ' +
          'Use AvaAdapter.capture() or ensure the mock is set up first.'
        );
      }

      export const test = mock.test;
      export default mock.default;
    `;

    return {
      format: 'module',
      shortCircuit: true,
      source,
    };
  }

  return nextLoad(url, context);
};
