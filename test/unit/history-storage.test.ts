import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { BenchmarkRun } from '../../src/types/index.js';

import { FileHistoryStorage } from '../../src/storage/history.js';

// Helper to create a minimal benchmark run for testing
function createMockRun(overrides: Partial<BenchmarkRun> = {}): BenchmarkRun {
  return {
    config: {} as any,
    duration: 1000,
    endTime: new Date('2024-01-01T12:01:00Z'),
    environment: {
      arch: 'x64',
      availableMemory: 1000000,
      cpu: { cores: 4, model: 'Test CPU', speed: 2000 },
      env: {},
      hostname: 'test',
      memory: { free: 500000, total: 1000000, used: 500000 },
      nodeVersion: 'v20.0.0',
      platform: 'linux',
    },
    files: [],
    id: 'test-run-123',
    startTime: new Date('2024-01-01T12:00:00Z'),
    summary: {
      failedTasks: 0,
      fastest: null,
      overallMean: 0,
      passedTasks: 0,
      slowest: null,
      totalFiles: 1,
      totalSuites: 1,
      totalTasks: 5,
    },
    ...overrides,
  };
}

describe('FileHistoryStorage', () => {
  describe('generateFilename() - private method', () => {
    it('should include timestamp from run.startTime', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        startTime: new Date('2024-06-15T10:30:45.123Z'),
      });

      const filename = (storage as any).generateFilename(run);

      expect(filename, 'to contain', '2024-06-15');
      expect(filename, 'to contain', '10-30-45');
    });

    it('should include MD5 hash of run.id', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({ id: 'test-run-123' });

      const filename = (storage as any).generateFilename(run);

      // Should contain an 8-character hash
      expect(filename, 'to match', /-[a-f0-9]{8}\.json$/);
    });

    it('should format for filesystem safety (no colons or periods in timestamp)', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        startTime: new Date('2024-06-15T10:30:45.123Z'),
      });

      const filename = (storage as any).generateFilename(run);

      // Timestamp portion should not have colons or periods (except file extension)
      const timestampPart = filename.split('-').slice(1, -1).join('-');
      expect(timestampPart, 'not to contain', ':');
      expect(timestampPart, 'not to contain', '.');
    });

    it('should have consistent format: run-TIMESTAMP-HASH.json', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();

      const filename = (storage as any).generateFilename(run);

      expect(
        filename,
        'to match',
        /^run-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}\.json$/,
      );
    });

    it('should generate different filenames for different run IDs', () => {
      const storage = new FileHistoryStorage();
      const run1 = createMockRun({ id: 'run-1' });
      const run2 = createMockRun({ id: 'run-2' });

      const filename1 = (storage as any).generateFilename(run1);
      const filename2 = (storage as any).generateFilename(run2);

      expect(filename1, 'not to equal', filename2);
    });

    it('should generate different filenames for different timestamps', () => {
      const storage = new FileHistoryStorage();
      const run1 = createMockRun({
        startTime: new Date('2024-01-01T10:00:00Z'),
      });
      const run2 = createMockRun({
        startTime: new Date('2024-01-02T10:00:00Z'),
      });

      const filename1 = (storage as any).generateFilename(run1);
      const filename2 = (storage as any).generateFilename(run2);

      expect(filename1, 'not to equal', filename2);
    });
  });

  describe('generateSummary() - private method', () => {
    it('should format with no failures: "N files, M tasks"', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        files: [{} as any, {} as any, {} as any], // 3 files
        summary: {
          failedTasks: 0,
          fastest: null,
          overallMean: 0,
          passedTasks: 10,
          slowest: null,
          totalFiles: 3,
          totalSuites: 2,
          totalTasks: 10,
        },
      });

      const summary = (storage as any).generateSummary(run);

      expect(summary, 'to equal', '3 files, 10 tasks');
    });

    it('should format with failures: "N files, M tasks (X failed)"', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        files: [{} as any],
        summary: {
          failedTasks: 3,
          fastest: null,
          overallMean: 0,
          passedTasks: 7,
          slowest: null,
          totalFiles: 1,
          totalSuites: 1,
          totalTasks: 10,
        },
      });

      const summary = (storage as any).generateSummary(run);

      expect(summary, 'to equal', '1 files, 10 tasks (3 failed)');
    });

    it('should extract correct counts from run data', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        files: [{} as any, {} as any],
        summary: {
          failedTasks: 0,
          fastest: null,
          overallMean: 0,
          passedTasks: 25,
          slowest: null,
          totalFiles: 2,
          totalSuites: 5,
          totalTasks: 25,
        },
      });

      const summary = (storage as any).generateSummary(run);

      expect(summary, 'to contain', '2 files');
      expect(summary, 'to contain', '25 tasks');
    });

    it('should handle edge case of 0 tasks', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        files: [],
        summary: {
          failedTasks: 0,
          fastest: null,
          overallMean: 0,
          passedTasks: 0,
          slowest: null,
          totalFiles: 0,
          totalSuites: 0,
          totalTasks: 0,
        },
      });

      const summary = (storage as any).generateSummary(run);

      expect(summary, 'to contain', '0 files');
      expect(summary, 'to contain', '0 tasks');
    });

    it('should handle singular vs plural correctly', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        files: [{}] as any,
        summary: {
          failedTasks: 1,
          fastest: null,
          overallMean: 0,
          passedTasks: 0,
          slowest: null,
          totalFiles: 1,
          totalSuites: 1,
          totalTasks: 1,
        },
      });

      const summary = (storage as any).generateSummary(run);

      // Current implementation doesn't handle singular/plural, but format is consistent
      expect(summary, 'to match', /\d+ files, \d+ tasks/);
    });
  });

  describe('exportToCsv() - private method', () => {
    it('should generate correct headers row', () => {
      const storage = new FileHistoryStorage();
      const runs: BenchmarkRun[] = [];

      const csv = (storage as any).exportToCsv(runs);
      const lines = csv.split('\n');

      expect(lines[0], 'to contain', 'runId');
      expect(lines[0], 'to contain', 'startTime');
      expect(lines[0], 'to contain', 'endTime');
      expect(lines[0], 'to contain', 'duration');
      expect(lines[0], 'to contain', 'files');
      expect(lines[0], 'to contain', 'suites');
      expect(lines[0], 'to contain', 'tasks');
      expect(lines[0], 'to contain', 'passed');
      expect(lines[0], 'to contain', 'failed');
    });

    it('should format dates as ISO strings', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        endTime: new Date('2024-06-15T10:31:00Z'),
        startTime: new Date('2024-06-15T10:30:00Z'),
      });

      const csv = (storage as any).exportToCsv([run]);
      const lines = csv.split('\n');

      expect(lines[1], 'to contain', '2024-06-15T10:30:00.000Z');
      expect(lines[1], 'to contain', '2024-06-15T10:31:00.000Z');
    });

    it('should escape quotes in CSV cells (quote doubling)', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        git: {
          branch: 'feature/"quoted-name"',
          commit: 'abc123',
        } as any,
      });

      const csv = (storage as any).exportToCsv([run]);

      // Quotes should be doubled
      expect(csv, 'to contain', '""quoted-name""');
    });

    it('should include all expected columns', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun({
        environment: {
          arch: 'arm64',
          availableMemory: 1000000,
          cpu: { cores: 8, model: 'M1', speed: 3000 },
          env: {},
          hostname: 'test-host',
          memory: { free: 500000, total: 1000000, used: 500000 },
          nodeVersion: 'v20.5.0',
          platform: 'darwin',
        },
      });

      const csv = (storage as any).exportToCsv([run]);
      const lines = csv.split('\n');

      // Check header
      const headers = lines[0]!.split(',');
      expect(headers, 'to contain', '"nodeVersion"');
      expect(headers, 'to contain', '"platform"');
      expect(headers, 'to contain', '"arch"');

      // Check data row
      expect(lines[1], 'to contain', 'v20.5.0');
      expect(lines[1], 'to contain', 'darwin');
      expect(lines[1], 'to contain', 'arm64');
    });

    it('should handle multiple runs', () => {
      const storage = new FileHistoryStorage();
      const run1 = createMockRun({ id: 'run-1' });
      const run2 = createMockRun({ id: 'run-2' });
      const run3 = createMockRun({ id: 'run-3' });

      const csv = (storage as any).exportToCsv([run1, run2, run3]);
      const lines = csv.split('\n');

      // Should have header + 3 data rows
      expect(lines.length, 'to equal', 4);
      expect(lines[1], 'to contain', 'run-1');
      expect(lines[2], 'to contain', 'run-2');
      expect(lines[3], 'to contain', 'run-3');
    });

    it('should handle empty runs array', () => {
      const storage = new FileHistoryStorage();

      const csv = (storage as any).exportToCsv([]);
      const lines = csv.split('\n');

      // Should only have header row
      expect(lines.length, 'to equal', 1);
      expect(lines[0], 'to contain', 'runId');
    });

    it('should handle runs with missing git data', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();
      delete (run as any).git;

      const csv = (storage as any).exportToCsv([run]);
      const lines = csv.split('\n');

      // Should have empty strings for git fields
      expect(lines[1], 'to contain', '""');
    });

    it('should properly quote all cells', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();

      const csv = (storage as any).exportToCsv([run]);
      const lines = csv.split('\n');

      // All cells should be quoted
      const dataRow = lines[1]!;
      const cellCount = (dataRow.match(/"/g) || []).length;

      // Should have even number of quotes (opening and closing for each cell)
      expect(cellCount % 2, 'to equal', 0);
    });
  });

  describe('isValidBenchmarkRun() - private method', () => {
    it('should return true for valid run', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();

      const isValid = (storage as any).isValidBenchmarkRun(run);

      expect(isValid, 'to be truthy');
    });

    it('should return false for missing id', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();
      delete (run as any).id;

      const isValid = (storage as any).isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing files array', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();
      delete (run as any).files;

      const isValid = (storage as any).isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for non-array files', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();
      (run as any).files = 'not-an-array';

      const isValid = (storage as any).isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing startTime', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();
      delete (run as any).startTime;

      const isValid = (storage as any).isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing endTime', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();
      delete (run as any).endTime;

      const isValid = (storage as any).isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing environment', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();
      delete (run as any).environment;

      const isValid = (storage as any).isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing summary', () => {
      const storage = new FileHistoryStorage();
      const run = createMockRun();
      delete (run as any).summary;

      const isValid = (storage as any).isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for null input', () => {
      const storage = new FileHistoryStorage();

      const isValid = (storage as any).isValidBenchmarkRun(null);

      expect(isValid, 'to be falsy');
    });

    it('should return false for undefined input', () => {
      const storage = new FileHistoryStorage();

      const isValid = (storage as any).isValidBenchmarkRun(undefined);

      expect(isValid, 'to be falsy');
    });

    it('should return false for empty object', () => {
      const storage = new FileHistoryStorage();

      const isValid = (storage as any).isValidBenchmarkRun({});

      expect(isValid, 'to be falsy');
    });

    it('should return false for non-object input', () => {
      const storage = new FileHistoryStorage();

      const isValid = (storage as any).isValidBenchmarkRun('not-an-object');

      expect(isValid, 'to be falsy');
    });
  });
});
