#!/usr/bin/env node
/**
 * ModestBench CLI Test Wrapper
 *
 * This is a test wrapper for the CLI that tests expect at dist/tests/fixtures/cli-wrapper.js
 */

import { cli } from '../../src/cli/index.js';

// Run the CLI
cli();
