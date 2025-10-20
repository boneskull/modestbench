import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { BenchmarkRun } from '../../src/types/index.js';

import { FileHistoryStorage } from '../../src/storage/history.js';

// Helper to create a minimal benchmark run for testing
const createMockRun = (overrides: Partial<BenchmarkRun> = {}): BenchmarkRun => {
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
      totalOperations: 0,
      totalSuites: 1,
      totalTasks: 5,
    },
    ...overrides,
  };
};

describe('FileHistoryStorage', () => {
  describe('isValidBenchmarkRun() - validation type guard', () => {
    it('should return true for valid run', () => {
      const run = createMockRun();

      const isValid = FileHistoryStorage.isValidBenchmarkRun(run);

      expect(isValid, 'to be truthy');
    });

    it('should return false for missing id', () => {
      const run = createMockRun();
      delete (run as any).id;

      const isValid = FileHistoryStorage.isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing files array', () => {
      const run = createMockRun();
      delete (run as any).files;

      const isValid = FileHistoryStorage.isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for non-array files', () => {
      const run = createMockRun();
      (run as any).files = 'not-an-array';

      const isValid = FileHistoryStorage.isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing startTime', () => {
      const run = createMockRun();
      delete (run as any).startTime;

      const isValid = FileHistoryStorage.isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing endTime', () => {
      const run = createMockRun();
      delete (run as any).endTime;

      const isValid = FileHistoryStorage.isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing environment', () => {
      const run = createMockRun();
      delete (run as any).environment;

      const isValid = FileHistoryStorage.isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for missing summary', () => {
      const run = createMockRun();
      delete (run as any).summary;

      const isValid = FileHistoryStorage.isValidBenchmarkRun(run);

      expect(isValid, 'to be falsy');
    });

    it('should return false for null input', () => {
      const isValid = FileHistoryStorage.isValidBenchmarkRun(null);

      expect(isValid, 'to be falsy');
    });

    it('should return false for undefined input', () => {
      const isValid = FileHistoryStorage.isValidBenchmarkRun(undefined);

      expect(isValid, 'to be falsy');
    });

    it('should return false for empty object', () => {
      const isValid = FileHistoryStorage.isValidBenchmarkRun({});

      expect(isValid, 'to be falsy');
    });

    it('should return false for non-object input', () => {
      const isValid = FileHistoryStorage.isValidBenchmarkRun('not-an-object');

      expect(isValid, 'to be falsy');
    });
  });
});
