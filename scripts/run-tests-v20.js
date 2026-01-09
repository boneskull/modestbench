#!/usr/bin/env node
import { globSync } from 'glob';
import { execFileSync } from 'node:child_process';

/**
 * Test runner for Node.js v20
 *
 * Node.js v20's `node --test` command doesn't support glob patterns. This
 * script uses the `glob` package to find test files and passes them to `node
 * --test`.
 */

const pattern = process.argv[2] || 'test/**/*.test.ts';
const files = globSync(pattern);

if (files.length === 0) {
  console.error(`No files matched pattern: ${pattern}`);
  process.exit(1);
}

execFileSync(
  process.execPath,
  ['--import', 'tsx', '--test', '--test-reporter=spec', ...files],
  { stdio: 'inherit' },
);
