/**
 * ModestBench Jest Loader Registration
 *
 * Registers the Jest ESM loader hooks via module.register().
 *
 * Usage: node --import modestbench/jest your-test.js
 *
 * This file registers the hooks module which intercepts '@jest/globals'
 * imports.
 */

import { register } from 'node:module';

register('./jest-hooks.js', {
  parentURL: import.meta.url,
});
