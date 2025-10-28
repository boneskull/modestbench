import { expect, expectAsync } from 'bupkis';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { runWithProfiling } from '../../src/services/profiler/profile-runner.js';

describe('ProfileRunner', () => {
  it('should run command with --cpu-prof flag and return profile path', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));

    try {
      // Run a simple command that will generate a profile
      const profilePath = await runWithProfiling(
        'node --eval "console.log(1)"',
        {
          cwd: tmpDir,
        },
      );

      expect(profilePath, 'to be a string');
      expect(profilePath, 'to match', /\.cpuprofile$/);
      expect(profilePath, 'to contain', '.modestbench/profiles');
      expect(profilePath, 'to start with', tmpDir);
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  });

  it('should handle command failure', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));

    try {
      await expectAsync(
        runWithProfiling('node --eval "process.exit(1)"', {
          cwd: tmpDir,
        }),
        'to reject with error satisfying',
        /Profile command exited with code 1/,
      );
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  });

  it('should respect timeout option', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));

    try {
      await expectAsync(
        runWithProfiling('node --eval "setTimeout(() => {}, 10000)"', {
          cwd: tmpDir,
          timeout: 100,
        }),
        'to reject with error satisfying',
        /Profile command timed out/,
      );
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  });

  it('should profile npm commands', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));

    try {
      // Create a simple package.json with a test script
      const { writeFile } = await import('node:fs/promises');
      await writeFile(
        join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          scripts: {
            test: 'node --eval "console.log(1)"',
          },
        }),
      );

      // Run npm test with profiling
      const profilePath = await runWithProfiling('npm test', {
        cwd: tmpDir,
      });

      expect(profilePath, 'to be a string');
      expect(profilePath, 'to match', /\.cpuprofile$/);
      expect(profilePath, 'to contain', '.modestbench/profiles');
      expect(profilePath, 'to start with', tmpDir);
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  });
});
