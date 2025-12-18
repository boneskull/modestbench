import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type {
  BenchmarkRun,
  CleanupResult,
  HistoryQuery,
  HistoryStorage,
  RetentionPolicy,
} from '../../../../src/types/index.js';

import { HistoryQueryService } from '../../../../src/services/history/query.js';
import { createRunId } from '../../../../src/utils/identifiers.js';

/**
 * Unit tests for HistoryQueryService
 *
 * Tests query building with date parsing and delegation to storage. Note:
 * parseDate() function is tested separately in test/unit/date-parsing.test.ts
 */

// Mock HistoryStorage implementation for testing
class MockHistoryStorage implements HistoryStorage {
  public lastQuery: null | Partial<HistoryQuery> = null;

  public mockRuns: BenchmarkRun[] = [];

  async cleanup(_policy: RetentionPolicy): Promise<CleanupResult> {
    return { freedBytes: 0, removedFiles: [], removedRuns: 0 };
  }

  async deleteRun(_id: string): Promise<boolean> {
    return true;
  }

  async export(
    _format: 'csv' | 'json',
    _query?: Partial<HistoryQuery>,
  ): Promise<string> {
    return '';
  }

  async getIndex(): Promise<
    Array<{ date: Date; id: string; summary: string }>
  > {
    return [];
  }

  async getRun(_id: string): Promise<BenchmarkRun | null> {
    return null;
  }

  async listRuns(_options?: {
    limit?: number;
    offset?: number;
  }): Promise<BenchmarkRun[]> {
    return this.mockRuns;
  }

  async loadRun(_id: string): Promise<BenchmarkRun | null> {
    return null;
  }

  async queryRuns(query: Partial<HistoryQuery>): Promise<BenchmarkRun[]> {
    this.lastQuery = query;
    return this.mockRuns;
  }

  async saveRun(_run: BenchmarkRun): Promise<void> {
    // No-op for testing
  }
}

// Helper to create a minimal benchmark run for testing
const createMockRun = (id: string): BenchmarkRun => ({
  config: {} as any,
  duration: 1000,
  endTime: new Date('2024-01-01T12:01:00Z'),
  environment: {
    arch: 'x64',
    availableMemory: 1_000_000,
    cpu: { cores: 4, model: 'Test CPU', speed: 2000 },
    env: {},
    hostname: 'test',
    memory: { free: 500_000, total: 1_000_000, used: 500_000 },
    nodeVersion: 'v20.0.0',
    platform: 'linux',
  },
  files: [],
  id: createRunId(id),
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
});

describe('HistoryQueryService', () => {
  describe('queryWithDateParsing()', () => {
    it('should call storage.queryRuns() with empty query for empty options', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({});

      expect(storage.lastQuery, 'not to be null');
      expect(Object.keys(storage.lastQuery!).length, 'to equal', 0);
    });

    it('should parse since date string and pass Date to storage', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        since: '2025-01-01T00:00:00Z',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.since, 'to be a', Date);
      expect(
        storage.lastQuery!.since!.toISOString(),
        'to equal',
        '2025-01-01T00:00:00.000Z',
      );
    });

    it('should parse until date string and pass Date to storage', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        until: '2025-01-31T23:59:59Z',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.until, 'to be a', Date);
      expect(
        storage.lastQuery!.until!.toISOString(),
        'to equal',
        '2025-01-31T23:59:59.000Z',
      );
    });

    it('should parse both since and until dates', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        since: '2025-01-01T00:00:00Z',
        until: '2025-01-31T23:59:59Z',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.since, 'to be a', Date);
      expect(storage.lastQuery!.until, 'to be a', Date);
    });

    it('should parse relative date expressions', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        since: '7 days ago',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.since, 'to be a', Date);

      // Check it's approximately 7 days ago (within 1 second tolerance)
      const now = new Date();
      const expectedTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      const actualTime = storage.lastQuery!.since!.getTime();

      expect(
        Math.abs(actualTime - expectedTime),
        'to be less than',
        2000, // 2 second tolerance
      );
    });

    it('should parse shorthand date formats', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        since: '1d',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.since, 'to be a', Date);

      // Check it's approximately 1 day ago (within 1 second tolerance)
      const now = new Date();
      const expectedTime = now.getTime() - 24 * 60 * 60 * 1000;
      const actualTime = storage.lastQuery!.since!.getTime();

      expect(Math.abs(actualTime - expectedTime), 'to be less than', 2000);
    });

    it('should pass pattern option through to storage', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        pattern: 'test-pattern-*',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.pattern, 'to equal', 'test-pattern-*');
    });

    it('should pass tags option through to storage', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        tags: ['performance', 'regression'],
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.tags, 'to be an array');
      expect(storage.lastQuery!.tags!.length, 'to equal', 2);
      expect(storage.lastQuery!.tags, 'to contain', 'performance');
      expect(storage.lastQuery!.tags, 'to contain', 'regression');
    });

    it('should pass limit option through to storage', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        limit: 50,
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.limit, 'to equal', 50);
    });

    it('should combine all options in query', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        limit: 25,
        pattern: 'bench-*',
        since: '2025-01-01T00:00:00Z',
        tags: ['unit-test'],
        until: '2025-01-31T23:59:59Z',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.since, 'to be a', Date);
      expect(storage.lastQuery!.until, 'to be a', Date);
      expect(storage.lastQuery!.pattern, 'to equal', 'bench-*');
      expect(storage.lastQuery!.tags, 'to contain', 'unit-test');
      expect(storage.lastQuery!.limit, 'to equal', 25);
    });

    it('should return runs from storage', async () => {
      const storage = new MockHistoryStorage();
      const mockRuns = [createMockRun('run-1'), createMockRun('run-2')];
      storage.mockRuns = mockRuns;

      const service = new HistoryQueryService(storage);

      const result = await service.queryWithDateParsing({});

      expect(result.length, 'to equal', 2);
      expect(result, 'to equal', mockRuns);
    });

    it('should not include pattern if not provided', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        since: '1d',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.pattern, 'to be undefined');
    });

    it('should not include tags if empty array', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        tags: [],
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.tags, 'to be undefined');
    });

    it('should not include limit if not provided', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        since: '1d',
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.limit, 'to be undefined');
    });

    it('should handle multiple tags', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        tags: ['tag1', 'tag2', 'tag3'],
      });

      expect(storage.lastQuery, 'not to be null');
      expect(storage.lastQuery!.tags!.length, 'to equal', 3);
      expect(storage.lastQuery!.tags, 'to contain', 'tag1');
      expect(storage.lastQuery!.tags, 'to contain', 'tag2');
      expect(storage.lastQuery!.tags, 'to contain', 'tag3');
    });

    it('should handle limit of 0', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      await service.queryWithDateParsing({
        limit: 0,
      });

      expect(storage.lastQuery, 'not to be null');
      // Limit 0 is falsy, so it should not be included
      expect(storage.lastQuery!.limit, 'to be undefined');
    });

    it('should propagate errors from storage', async () => {
      class ErrorStorage extends MockHistoryStorage {
        override async queryRuns(
          _query: Partial<HistoryQuery>,
        ): Promise<BenchmarkRun[]> {
          throw new Error('Storage error');
        }
      }

      const storage = new ErrorStorage();
      const service = new HistoryQueryService(storage);

      let errorThrown = false;
      try {
        await service.queryWithDateParsing({});
      } catch (error) {
        errorThrown = true;
        expect(error, 'to be an', Error);
        expect((error as Error).message, 'to match', /Storage error/);
      }

      expect(errorThrown, 'to be', true);
    });

    it('should propagate errors from date parsing', async () => {
      const storage = new MockHistoryStorage();
      const service = new HistoryQueryService(storage);

      let errorThrown = false;
      try {
        await service.queryWithDateParsing({
          since: 'invalid-date-format',
        });
      } catch (error) {
        errorThrown = true;
        expect(error, 'to be an', Error);
        expect((error as Error).message, 'to match', /Invalid date format/);
      }

      expect(errorThrown, 'to be', true);
    });
  });
});
