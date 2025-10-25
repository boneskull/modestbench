import { expect } from 'bupkis';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Integration tests for date handling in history commands.
 *
 * These tests verify that dates loaded from JSON storage (which come back as
 * strings) are properly converted to Date objects before being used in display
 * and calculations.
 */

describe('History date handling', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-dates-'));
    await mkdir(join(tempDir, '.modestbench'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('trends command date conversion', () => {
    it('should handle dates from stored history without crashing', async () => {
      // Create a benchmark file
      const benchFile = join(tempDir, 'date-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Date Test Suite': {
              benchmarks: {
                'date-task': { fn: () => { return 42; } }
              }
            }
          }
        };
      `,
      );

      // Run benchmark multiple times to create history
      for (let i = 0; i < 3; i++) {
        await runCommand(['run', benchFile, '--iterations', '5'], tempDir);
      }

      // Run trends command - this should not crash
      const result = await runCommand(['history', 'trends'], tempDir);

      expect(result, 'to satisfy', {
        exitCode: 0,
        stderr: expect.it(
          'not to match',
          /toLocaleDateString is not a function/,
        ),
        stdout: expect.it('to match', /Performance Trends/),
      });
    });

    it('should display date range correctly in human format', async () => {
      const benchFile = join(tempDir, 'date-range.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Range Suite': {
              benchmarks: {
                'range-task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      // Create multiple runs
      for (let i = 0; i < 4; i++) {
        await runCommand(['run', benchFile, '--iterations', '3'], tempDir);
      }

      const result = await runCommand(['history', 'trends'], tempDir);

      expect(result.exitCode, 'to equal', 0);
      // Should show "Time range: MM/DD/YYYY to MM/DD/YYYY"
      expect(
        result.stdout,
        'to match',
        /Time range:.*\d+\/\d+\/\d+.*to.*\d+\/\d+\/\d+/,
      );
    });

    it('should output valid date objects in JSON format', async () => {
      const benchFile = join(tempDir, 'json-dates.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'JSON Suite': {
              benchmarks: {
                'json-task': { fn: () => 2 + 2 }
              }
            }
          }
        };
      `,
      );

      // Create runs
      for (let i = 0; i < 3; i++) {
        await runCommand(['run', benchFile, '--iterations', '2'], tempDir);
      }

      const result = await runCommand(
        ['history', 'trends', '--format', 'json'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to be defined');

      const data = JSON.parse(result.stdout) as {
        summary: { timespan: { end: string; start: string } };
        trends: Array<{
          dataPoints: Array<{ date: string; mean: number }>;
        }>;
      };

      // Check structure with to satisfy
      expect(data, 'to satisfy', {
        summary: expect.it('to have property', 'timespan'),
        trends: expect.it('not to be empty'),
      });

      // Verify first trend has data points
      const firstTrend = data.trends[0];
      expect(firstTrend, 'to be defined');
      expect(firstTrend?.dataPoints, 'not to be empty');

      // Date should be parseable
      const firstDataPoint = firstTrend?.dataPoints?.[0];
      expect(firstDataPoint, 'to be defined');
      const parsedDate = new Date((firstDataPoint as { date: string }).date);
      expect(Number.isNaN(parsedDate.getTime()), 'to be', false);
    });

    it('should sort data points correctly by date', async () => {
      const benchFile = join(tempDir, 'sort-dates.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Sort Suite': {
              benchmarks: {
                'sort-task': { fn: () => { let x = 0; for(let i = 0; i < 50; i++) x++; return x; } }
              }
            }
          }
        };
      `,
      );

      // Create multiple runs with slight delays
      for (let i = 0; i < 5; i++) {
        await runCommand(['run', benchFile, '--iterations', '3'], tempDir);
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const result = await runCommand(
        ['history', 'trends', '--format', 'json'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to be defined');

      const data = JSON.parse(result.stdout) as {
        trends: Array<{
          dataPoints: Array<{ date: string; mean: number }>;
        }>;
      };

      expect(data.trends, 'not to be empty');

      const dataPoints = data.trends[0]?.dataPoints;
      expect(dataPoints, 'to be defined', 'and', 'not to be empty');

      // Verify dates are in chronological order (oldest first)
      const points = dataPoints as Array<{ date: string; mean: number }>;
      for (let i = 1; i < points.length; i++) {
        const prevTime = new Date(points[i - 1]!.date).getTime();
        const currTime = new Date(points[i]!.date).getTime();
        expect(prevTime, 'to be less than or equal to', currTime);
      }
    });

    it('should handle trends when runs have only one data point', async () => {
      const benchFile = join(tempDir, 'single-run.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Single Suite': {
              benchmarks: {
                'single-task': { fn: () => 100 }
              }
            }
          }
        };
      `,
      );

      // Create just one run
      await runCommand(['run', benchFile, '--iterations', '5'], tempDir);

      const result = await runCommand(['history', 'trends'], tempDir);

      expect(result, 'to satisfy', {
        exitCode: 0,
        stderr: expect.it(
          'not to match',
          /toLocaleDateString is not a function/,
        ),
        stdout: expect.it('to match', /Performance Trends \(1 runs?\)/),
      });
    });

    it('should handle empty runs array gracefully', async () => {
      // Test with no history at all
      const emptyDir = join(tempDir, 'empty-for-trends');
      await mkdir(emptyDir, { recursive: true });

      const result = await runCommand(['history', 'trends'], emptyDir);

      expect(result, 'to satisfy', {
        exitCode: 0,
        stderr: expect.it(
          'not to match',
          /toLocaleDateString is not a function/,
        ),
        stdout: expect.it('to match', /No historical data/),
      });
    });
  });

  describe('compare command date handling', () => {
    it('should display run dates correctly in comparison', async () => {
      const benchFile = join(tempDir, 'compare-dates.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Compare Suite': {
              benchmarks: {
                'compare-task': { fn: () => { return 42; } }
              }
            }
          }
        };
      `,
      );

      // Create two runs
      await runCommand(['run', benchFile, '--iterations', '5'], tempDir);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await runCommand(['run', benchFile, '--iterations', '5'], tempDir);

      // Get run IDs
      const listResult = await runCommand(
        ['history', 'list', '--format', 'json', '--limit', '2'],
        tempDir,
      );

      expect(listResult.exitCode, 'to equal', 0);
      expect(listResult.stdout, 'to be defined');

      const data = JSON.parse(listResult.stdout) as Array<{ id: string }>;

      expect(data.length, 'to be greater than or equal to', 2);

      const run1Id = data[0]!.id;
      const run2Id = data[1]!.id;

      const compareResult = await runCommand(
        ['history', 'compare', run1Id, run2Id],
        tempDir,
      );

      expect(compareResult, 'to satisfy', {
        exitCode: 0,
        stderr: expect.it(
          'not to match',
          /toLocaleDateString is not a function/,
        ),
      });
    });
  });

  describe('list command date handling', () => {
    it('should display dates correctly in list output', async () => {
      const benchFile = join(tempDir, 'list-dates.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'List Suite': {
              benchmarks: {
                'list-task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      // Create a run
      await runCommand(['run', benchFile, '--iterations', '3'], tempDir);

      const result = await runCommand(['history', 'list'], tempDir);

      expect(result, 'to satisfy', {
        exitCode: 0,
        stderr: expect.it(
          'not to match',
          /toLocaleDateString is not a function/,
        ),
      });
    });

    it('should handle date filtering with stored dates', async () => {
      const benchFile = join(tempDir, 'filter-dates.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Filter Suite': {
              benchmarks: {
                'filter-task': { fn: () => 2 }
              }
            }
          }
        };
      `,
      );

      // Create runs
      await runCommand(['run', benchFile, '--iterations', '2'], tempDir);

      // Filter by date - should work with converted dates
      const result = await runCommand(
        ['history', 'list', '--since', '1d'],
        tempDir,
      );

      expect(result, 'to satisfy', {
        exitCode: 0,
        stderr: expect.it(
          'not to match',
          /Invalid since date|date parsing error/,
        ),
      });
    });
  });
});
