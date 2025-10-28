import { expect } from 'bupkis';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { parseProfile } from '../../src/services/profiler/profile-parser.js';

describe('ProfileParser', () => {
  describe('parseProfile', () => {
    it('should parse CPU profile JSON format', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
      const profilePath = join(tmpDir, 'test.cpuprofile');

      try {
        // Create a mock CPU profile
        const profile = {
          endTime: 1000000,
          nodes: [
            {
              callFrame: {
                columnNumber: 0,
                functionName: 'sortArray',
                lineNumber: 41, // 0-based
                scriptId: '1',
                url: 'file:///path/to/src/utils.js',
              },
              children: [],
              hitCount: 100,
              id: 1,
            },
            {
              callFrame: {
                columnNumber: 5,
                functionName: 'validateInput',
                lineNumber: 14, // 0-based
                scriptId: '2',
                url: 'file:///path/to/src/validator.js',
              },
              children: [],
              hitCount: 50,
              id: 2,
            },
            {
              callFrame: {
                columnNumber: 0,
                functionName: 'parseData',
                lineNumber: 27, // 0-based
                scriptId: '3',
                url: 'file:///path/to/src/parser.js',
              },
              children: [],
              hitCount: 25,
              id: 3,
            },
          ],
          samples: [1, 1, 2, 3],
          startTime: 0,
        };

        await writeFile(profilePath, JSON.stringify(profile));

        const result = await parseProfile(profilePath);

        expect(result.functions.length, 'to equal', 3);
        expect(result.totalTicks, 'to equal', 175);

        // Check first function
        expect(result.functions[0]?.name, 'to equal', 'sortArray');
        expect(result.functions[0]?.file, 'to match', /utils\.js$/);
        expect(result.functions[0]?.line, 'to equal', 42); // Converted to 1-based
        expect(result.functions[0]?.ticks, 'to equal', 100);
        expect(result.functions[0]?.percentage, 'to be close to', 57.14, 0.01);
        expect(result.functions[0]?.category, 'to equal', 'JavaScript');
      } finally {
        await rm(tmpDir, { force: true, recursive: true });
      }
    });

    it('should handle functions without line numbers', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
      const profilePath = join(tmpDir, 'test.cpuprofile');

      try {
        const profile = {
          endTime: 1000000,
          nodes: [
            {
              callFrame: {
                columnNumber: 0,
                functionName: 'anonymousFunc',
                lineNumber: -1, // No line number
                scriptId: '1',
                url: 'file:///path/to/src/utils.js',
              },
              children: [],
              hitCount: 50,
              id: 1,
            },
          ],
          samples: [1],
          startTime: 0,
        };

        await writeFile(profilePath, JSON.stringify(profile));

        const result = await parseProfile(profilePath);

        expect(result.functions[0]?.line, 'to be null');
      } finally {
        await rm(tmpDir, { force: true, recursive: true });
      }
    });

    it('should handle anonymous functions', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
      const profilePath = join(tmpDir, 'test.cpuprofile');

      try {
        const profile = {
          endTime: 1000000,
          nodes: [
            {
              callFrame: {
                columnNumber: 0,
                functionName: '', // Anonymous
                lineNumber: 10,
                scriptId: '1',
                url: 'file:///path/to/src/utils.js',
              },
              children: [],
              hitCount: 50,
              id: 1,
            },
          ],
          samples: [1],
          startTime: 0,
        };

        await writeFile(profilePath, JSON.stringify(profile));

        const result = await parseProfile(profilePath);

        expect(result.functions[0]?.name, 'to equal', '(anonymous)');
      } finally {
        await rm(tmpDir, { force: true, recursive: true });
      }
    });

    it('should categorize Node.js internals as C++', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
      const profilePath = join(tmpDir, 'test.cpuprofile');

      try {
        const profile = {
          endTime: 1000000,
          nodes: [
            {
              callFrame: {
                columnNumber: 0,
                functionName: 'readFile',
                lineNumber: 10,
                scriptId: '1',
                url: 'node:fs',
              },
              children: [],
              hitCount: 50,
              id: 1,
            },
          ],
          samples: [1],
          startTime: 0,
        };

        await writeFile(profilePath, JSON.stringify(profile));

        const result = await parseProfile(profilePath);

        expect(result.functions[0]?.category, 'to equal', 'C++');
      } finally {
        await rm(tmpDir, { force: true, recursive: true });
      }
    });

    it('should skip nodes with no hit counts', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
      const profilePath = join(tmpDir, 'test.cpuprofile');

      try {
        const profile = {
          endTime: 1000000,
          nodes: [
            {
              callFrame: {
                columnNumber: 0,
                functionName: 'funcWithHits',
                lineNumber: 10,
                scriptId: '1',
                url: 'file:///path/to/src/utils.js',
              },
              children: [],
              hitCount: 50,
              id: 1,
            },
            {
              callFrame: {
                columnNumber: 0,
                functionName: 'funcWithoutHits',
                lineNumber: 20,
                scriptId: '2',
                url: 'file:///path/to/src/other.js',
              },
              children: [],
              hitCount: 0,
              id: 2,
            },
          ],
          samples: [1],
          startTime: 0,
        };

        await writeFile(profilePath, JSON.stringify(profile));

        const result = await parseProfile(profilePath);

        expect(result.functions.length, 'to equal', 1);
        expect(result.functions[0]?.name, 'to equal', 'funcWithHits');
      } finally {
        await rm(tmpDir, { force: true, recursive: true });
      }
    });
  });
});
