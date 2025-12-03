/**
 * ModestBench AVA Loader Registration
 *
 * Registers the AVA ESM loader hooks via module.register().
 *
 * Usage: node --import modestbench/ava your-test.js
 *
 * This file registers the hooks module which intercepts 'ava' imports.
 */

import { register } from 'node:module';

register('./ava-hooks.js', {
  parentURL: import.meta.url,
});
