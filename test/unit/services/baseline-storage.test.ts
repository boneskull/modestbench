import { expect, expectAsync } from 'bupkis';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { BaselineStorageService } from '../../../src/services/baseline-storage.js';
import {
  type BenchmarkRun,
  createRunId,
  createTaskId,
} from '../../../src/types/core.js';

describe('BaselineStorageService', () => {
  let tempDir: string;
  let service: BaselineStorageService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'modestbench-baseline-test-'));
    service = new BaselineStorageService(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true });
  });

  describe('saveBaseline', () => {
    it('should save a new baseline', async () => {
      const mockRun: BenchmarkRun = {
        config: {} as any,
        duration: 60_000,
        endTime: new Date('2025-10-26T12:01:00Z'),
        environment: {} as any,
        files: [
          {
            duration: 1000,
            endTime: new Date(),
            filePath: 'test.bench.js',
            startTime: new Date(),
            suites: [
              {
                duration: 1000,
                endTime: new Date(),
                name: 'default',
                startTime: new Date(),
                tasks: [
                  {
                    cv: 6.1,
                    iterations: 1000,
                    marginOfError: 2.5,
                    max: 9_000_000,
                    mean: 8_200_000,
                    min: 8_000_000,
                    name: 'testTask',
                    opsPerSecond: 121_951,
                    p95: 8_800_000,
                    p99: 9_000_000,
                    stdDev: 500_000,
                    variance: 250_000_000_000,
                  },
                ],
              },
            ],
          },
        ],
        id: createRunId('abc1234'),
        startTime: new Date('2025-10-26T12:00:00Z'),
        summary: {} as any,
      };

      await service.saveBaseline('v1.0', mockRun, {
        branch: 'main',
        commit: '1234567890abcdef1234567890abcdef12345678',
      });

      const baseline = await service.getBaseline('v1.0');
      expect(baseline, 'to be defined');
      expect(baseline, 'to satisfy', {
        branch: 'main',
        commit: '1234567890abcdef1234567890abcdef12345678',
        name: 'v1.0',
        runId: 'abc1234',
      });
    });

    it('should overwrite existing baseline', async () => {
      const run1: BenchmarkRun = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };

      const run2: BenchmarkRun = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('def5678'),
        startTime: new Date(),
        summary: {} as any,
      };

      await service.saveBaseline('test', run1);
      await service.saveBaseline('test', run2);

      const baseline = await service.getBaseline('test');
      expect(baseline?.runId, 'to equal', 'def5678');
    });

    it('should extract task summary from run', async () => {
      const mockRun: BenchmarkRun = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [
          {
            duration: 1000,
            endTime: new Date(),
            filePath: 'bench.js',
            startTime: new Date(),
            suites: [
              {
                duration: 1000,
                endTime: new Date(),
                name: 'suite1',
                startTime: new Date(),
                tasks: [
                  {
                    cv: 6.0,
                    iterations: 100,
                    marginOfError: 2.0,
                    max: 6_200_000,
                    mean: 5_000_000,
                    min: 4_800_000,
                    name: 'task1',
                    opsPerSecond: 200_000,
                    p95: 5_800_000,
                    p99: 6_000_000,
                    stdDev: 300_000,
                    variance: 90_000_000_000,
                  },
                  {
                    cv: 3.33,
                    iterations: 100,
                    marginOfError: 1.5,
                    max: 3_200_000,
                    mean: 3_000_000,
                    min: 2_800_000,
                    name: 'task2',
                    opsPerSecond: 333_333,
                    p95: 3_100_000,
                    p99: 3_150_000,
                    stdDev: 100_000,
                    variance: 10_000_000_000,
                  },
                ],
              },
            ],
          },
        ],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };

      await service.saveBaseline('test', mockRun);

      const baseline = await service.getBaseline('test');
      expect(baseline, 'to be defined');
      expect(
        baseline!.summary[createTaskId('bench.js/suite1/task1')],
        'to satisfy',
        {
          mean: 5_000_000,
          opsPerSecond: 200_000,
          p99: 6_000_000,
        },
      );
      expect(
        baseline!.summary[createTaskId('bench.js/suite1/task2')],
        'to satisfy',
        {
          mean: 3_000_000,
          opsPerSecond: 333_333,
        },
      );
      expect(
        baseline!.summary[createTaskId('bench.js/suite1/task2')]!.p99,
        'to equal',
        3_150_000,
      );
    });
  });

  describe('getBaseline', () => {
    it('should return null for non-existent baseline', async () => {
      const baseline = await service.getBaseline('nonexistent');
      expect(baseline, 'to be null');
    });

    it('should return baseline by name', async () => {
      const mockRun: BenchmarkRun = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };

      await service.saveBaseline('test', mockRun);

      const baseline = await service.getBaseline('test');
      expect(baseline, 'to be defined');
      expect(baseline!.name, 'to equal', 'test');
    });
  });

  describe('listBaselines', () => {
    it('should return empty array when no baselines', async () => {
      const baselines = await service.listBaselines();
      expect(baselines, 'to be empty');
    });

    it('should return all baselines', async () => {
      const run1 = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };
      const run2 = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('def5678'),
        startTime: new Date(),
        summary: {} as any,
      };

      await service.saveBaseline('v1.0', run1);
      await service.saveBaseline('v2.0', run2);

      const baselines = await service.listBaselines();
      expect(baselines.length, 'to equal', 2);
      expect(
        baselines.find((b) => b.name === 'v1.0'),
        'to be defined',
      );
      expect(
        baselines.find((b) => b.name === 'v2.0'),
        'to be defined',
      );
    });

    it('should sort baselines by date descending', async () => {
      const run1 = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date('2025-10-25'),
        summary: {} as any,
      };
      const run2 = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('def5678'),
        startTime: new Date('2025-10-26'),
        summary: {} as any,
      };

      await service.saveBaseline('old', run1);
      await service.saveBaseline('new', run2);

      const baselines = await service.listBaselines();
      expect(baselines[0]!.name, 'to equal', 'new');
      expect(baselines[1]!.name, 'to equal', 'old');
    });
  });

  describe('deleteBaseline', () => {
    it('should delete a baseline', async () => {
      const run = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };
      await service.saveBaseline('test', run);

      await service.deleteBaseline('test');

      const baseline = await service.getBaseline('test');
      expect(baseline, 'to be null');
    });

    it('should not throw when deleting non-existent baseline', async () => {
      await service.deleteBaseline('nonexistent');
      // Should not throw
    });
  });

  describe('setDefault', () => {
    it('should set default baseline', async () => {
      const run = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };
      await service.saveBaseline('test', run);

      await service.setDefault('test');

      const defaultName = await service.getDefault();
      expect(defaultName, 'to equal', 'test');
    });

    it('should throw when setting non-existent baseline as default', async () => {
      await expectAsync(service.setDefault('nonexistent'), 'to reject');
    });
  });

  describe('getDefault', () => {
    it('should return null when no default set', async () => {
      const defaultName = await service.getDefault();
      expect(defaultName, 'to be null');
    });

    it('should return default baseline name', async () => {
      const run = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };
      await service.saveBaseline('test', run);
      await service.setDefault('test');

      const defaultName = await service.getDefault();
      expect(defaultName, 'to equal', 'test');
    });
  });

  describe('resolveBaselineName', () => {
    it('should return provided name if specified', async () => {
      const run = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };
      await service.saveBaseline('test', run);
      await service.saveBaseline('default', run);
      await service.setDefault('default');

      const resolved = await service.resolveBaselineName('test');
      expect(resolved, 'to equal', 'test');
    });

    it('should return default name if no name provided', async () => {
      const run = {
        config: {} as any,
        duration: 1000,
        endTime: new Date(),
        environment: {} as any,
        files: [],
        id: createRunId('abc1234'),
        startTime: new Date(),
        summary: {} as any,
      };
      await service.saveBaseline('default', run);
      await service.setDefault('default');

      const resolved = await service.resolveBaselineName();
      expect(resolved, 'to equal', 'default');
    });

    it('should return null if no name provided and no default', async () => {
      const resolved = await service.resolveBaselineName();
      expect(resolved, 'to be null');
    });
  });

  describe('file corruption handling', () => {
    it('should handle missing baseline file', async () => {
      const baseline = await service.getBaseline('test');
      expect(baseline, 'to be null');
    });

    it('should handle corrupted JSON', async () => {
      const fs = await import('node:fs/promises');
      await fs.writeFile(
        join(tempDir, '.modestbench.baselines.json'),
        'invalid json{',
      );

      await expectAsync(service.listBaselines(), 'to reject');
    });
  });
});
