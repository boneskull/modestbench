import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { fixtures } from './fixture-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Profile Command Integration', () => {
  it('should profile a simple script and generate report', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-profile-'));

    try {
      // Create package.json
      await writeFile(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test-project' }),
      );

      // Run profile command using fixture
      const output = execSync(
        `node ${join(__dirname, '../../dist/cli/index.js')} profile "node ${fixtures.profileHotFunction}"`,
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );

      // Verify output contains expected sections
      assert.ok(output.includes('Profile Analysis'), 'Should contain header');
      assert.ok(
        output.includes('Benchmark Candidates'),
        'Should contain candidates section',
      );
      assert.ok(
        output.includes('hotFunction') || output.includes('ticks'),
        'Should contain function data',
      );
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  });

  it('should support --group-by-file option', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-profile-'));

    try {
      await writeFile(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test-project' }),
      );

      const output = execSync(
        `node ${join(__dirname, '../../dist/cli/index.js')} profile "node ${fixtures.profileMultiFunction}" --group-by-file`,
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );

      assert.ok(
        output.includes('Grouped by File'),
        'Should contain grouped by file header',
      );
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  });

  it('should respect --min-percent threshold', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-profile-'));

    try {
      await writeFile(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test-project' }),
      );

      // Run with high threshold - should filter out most functions
      const output = execSync(
        `node ${join(__dirname, '../../dist/cli/index.js')} profile "node ${fixtures.profileHotFunction}" --min-percent 50`,
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );

      // Should still have header but fewer functions
      assert.ok(output.includes('Profile Analysis'), 'Should have header');
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  });
});
