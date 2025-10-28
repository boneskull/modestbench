import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Profile Command Integration', () => {
  it('should profile a simple script and generate report', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-profile-test-'));

    try {
      // Create a simple script to profile
      const scriptPath = join(tmpDir, 'test-script.js');
      await writeFile(
        scriptPath,
        `
        function hotFunction() {
          let sum = 0;
          for (let i = 0; i < 1000000; i++) {
            sum += i;
          }
          return sum;
        }
        
        for (let i = 0; i < 10; i++) {
          hotFunction();
        }
        `,
      );

      // Create package.json
      await writeFile(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test-project' }),
      );

      // Run profile command
      const output = execSync(
        `node ${join(__dirname, '../../dist/cli/index.js')} profile "node ${scriptPath}"`,
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
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-profile-test-'));

    try {
      const scriptPath = join(tmpDir, 'test-script.js');
      await writeFile(
        scriptPath,
        `
        function funcA() {
          let sum = 0;
          for (let i = 0; i < 500000; i++) sum += i;
          return sum;
        }
        
        function funcB() {
          let product = 1;
          for (let i = 1; i < 100; i++) product *= i;
          return product;
        }
        
        for (let i = 0; i < 10; i++) {
          funcA();
          funcB();
        }
        `,
      );

      await writeFile(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test-project' }),
      );

      const output = execSync(
        `node ${join(__dirname, '../../dist/cli/index.js')} profile "node ${scriptPath}" --group-by-file`,
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
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-profile-test-'));

    try {
      const scriptPath = join(tmpDir, 'test-script.js');
      await writeFile(
        scriptPath,
        `
        function hotFunction() {
          let sum = 0;
          for (let i = 0; i < 1000000; i++) sum += i;
          return sum;
        }
        
        for (let i = 0; i < 10; i++) hotFunction();
        `,
      );

      await writeFile(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test-project' }),
      );

      // Run with high threshold - should filter out most functions
      const output = execSync(
        `node ${join(__dirname, '../../dist/cli/index.js')} profile "node ${scriptPath}" --min-percent 50`,
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
