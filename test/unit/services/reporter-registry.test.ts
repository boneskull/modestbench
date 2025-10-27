import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type {
  BenchmarkRun,
  FileResult,
  ProgressState,
  Reporter,
  SuiteResult,
  TaskResult,
} from '../../../src/types/index.js';

import {
  BaseReporter,
  ModestBenchReporterRegistry,
} from '../../../src/services/reporter-registry.js';

// Helper class to test BaseReporter protected methods
class TestReporter extends BaseReporter {
  constructor() {
    super('test-reporter', {});
  }

  async onEnd(_run: BenchmarkRun): Promise<void> {}

  async onError(_error: Error): Promise<void> {}

  async onFileEnd(_result: FileResult): Promise<void> {}

  async onFileStart(_file: string): Promise<void> {}

  async onProgress(_state: ProgressState): Promise<void> {}

  async onStart(_run: BenchmarkRun): Promise<void> {}

  async onSuiteEnd(_result: SuiteResult): Promise<void> {}

  async onSuiteStart(_suite: string): Promise<void> {}

  async onTaskResult(_result: TaskResult): Promise<void> {}

  async onTaskStart(_task: string): Promise<void> {}

  // Expose protected static methods for testing
  public testFormatDuration(ns: number): string {
    return BaseReporter.formatDuration(ns);
  }

  public testFormatOpsPerSecond(ops: number): string {
    return BaseReporter.formatOpsPerSecond(ops);
  }

  public testFormatPercentage(value: number): string {
    return BaseReporter.formatPercentage(value);
  }
}

describe('BaseReporter', () => {
  describe('formatDuration()', () => {
    it('should format nanoseconds (< 1000ns)', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatDuration(500), 'to equal', '500.00ns');
      expect(reporter.testFormatDuration(1), 'to equal', '1.00ns');
      expect(reporter.testFormatDuration(999), 'to equal', '999.00ns');
    });

    it('should format microseconds (1000ns - 1ms)', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatDuration(1000), 'to equal', '1.00μs');
      expect(reporter.testFormatDuration(5000), 'to equal', '5.00μs');
      expect(reporter.testFormatDuration(999999), 'to equal', '1000.00μs');
    });

    it('should format milliseconds (1ms - 1s)', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatDuration(1000000), 'to equal', '1.00ms');
      expect(reporter.testFormatDuration(5500000), 'to equal', '5.50ms');
      expect(reporter.testFormatDuration(999999999), 'to equal', '1000.00ms');
    });

    it('should format seconds (>= 1s)', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatDuration(1000000000), 'to equal', '1.00s');
      expect(reporter.testFormatDuration(2500000000), 'to equal', '2.50s');
      expect(reporter.testFormatDuration(60000000000), 'to equal', '60.00s');
    });

    it('should use 2 decimal places', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatDuration(1234), 'to match', /^\d+\.\d{2}μs$/);
      expect(
        reporter.testFormatDuration(1234567),
        'to match',
        /^\d+\.\d{2}ms$/,
      );
    });

    it('should handle 0 correctly', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatDuration(0), 'to equal', '0.00ns');
    });

    it('should handle very large values', () => {
      const reporter = new TestReporter();

      const result = reporter.testFormatDuration(1000000000000); // 1000 seconds
      expect(result, 'to contain', 's');
      expect(result, 'to match', /^\d+\.\d{2}s$/);
    });

    it('should format boundary values correctly', () => {
      const reporter = new TestReporter();

      // Just under microsecond threshold
      expect(reporter.testFormatDuration(999.9), 'to contain', 'ns');

      // Just at microsecond threshold
      expect(reporter.testFormatDuration(1000), 'to contain', 'μs');

      // Just under millisecond threshold
      expect(reporter.testFormatDuration(999999), 'to contain', 'μs');

      // Just at millisecond threshold
      expect(reporter.testFormatDuration(1000000), 'to contain', 'ms');
    });
  });

  describe('formatOpsPerSecond()', () => {
    it('should format ops/sec (< 1000)', () => {
      const reporter = new TestReporter();

      expect(
        reporter.testFormatOpsPerSecond(500),
        'to equal',
        '500.00 ops/sec',
      );
      expect(reporter.testFormatOpsPerSecond(1), 'to equal', '1.00 ops/sec');
      expect(
        reporter.testFormatOpsPerSecond(999),
        'to equal',
        '999.00 ops/sec',
      );
    });

    it('should format K ops/sec (1K - 1M)', () => {
      const reporter = new TestReporter();

      expect(
        reporter.testFormatOpsPerSecond(1000),
        'to equal',
        '1.00K ops/sec',
      );
      expect(
        reporter.testFormatOpsPerSecond(5500),
        'to equal',
        '5.50K ops/sec',
      );
      expect(
        reporter.testFormatOpsPerSecond(999999),
        'to equal',
        '1000.00K ops/sec',
      );
    });

    it('should format M ops/sec (1M - 1B)', () => {
      const reporter = new TestReporter();

      expect(
        reporter.testFormatOpsPerSecond(1000000),
        'to equal',
        '1.00M ops/sec',
      );
      expect(
        reporter.testFormatOpsPerSecond(2500000),
        'to equal',
        '2.50M ops/sec',
      );
      expect(
        reporter.testFormatOpsPerSecond(999999999),
        'to equal',
        '1000.00M ops/sec',
      );
    });

    it('should format B ops/sec (>= 1B)', () => {
      const reporter = new TestReporter();

      expect(
        reporter.testFormatOpsPerSecond(1000000000),
        'to equal',
        '1.00B ops/sec',
      );
      expect(
        reporter.testFormatOpsPerSecond(5500000000),
        'to equal',
        '5.50B ops/sec',
      );
    });

    it('should use 2 decimal places', () => {
      const reporter = new TestReporter();

      expect(
        reporter.testFormatOpsPerSecond(123),
        'to match',
        /^\d+\.\d{2} ops\/sec$/,
      );
      expect(
        reporter.testFormatOpsPerSecond(123456),
        'to match',
        /^\d+\.\d{2}[KMB] ops\/sec$/,
      );
    });

    it('should handle 0 correctly', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatOpsPerSecond(0), 'to equal', '0.00 ops/sec');
    });

    it('should handle very large values', () => {
      const reporter = new TestReporter();

      const result = reporter.testFormatOpsPerSecond(10_000_000_000_000);
      expect(result, 'to contain', 'B ops/sec');
    });

    it('should format boundary values correctly', () => {
      const reporter = new TestReporter();

      // Just under K threshold
      expect(reporter.testFormatOpsPerSecond(999.9), 'to contain', ' ops/sec');

      // Just at K threshold
      expect(reporter.testFormatOpsPerSecond(1000), 'to contain', 'K ops/sec');

      // Just under M threshold
      expect(
        reporter.testFormatOpsPerSecond(999999),
        'to contain',
        'K ops/sec',
      );

      // Just at M threshold
      expect(
        reporter.testFormatOpsPerSecond(1000000),
        'to contain',
        'M ops/sec',
      );
    });
  });

  describe('formatPercentage()', () => {
    it('should format with 2 decimal places', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatPercentage(42.123), 'to equal', '42.12%');
      expect(reporter.testFormatPercentage(99.999), 'to equal', '100.00%');
      expect(reporter.testFormatPercentage(1.234), 'to equal', '1.23%');
    });

    it('should include % symbol', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatPercentage(50), 'to contain', '%');
    });

    it('should handle 0 correctly', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatPercentage(0), 'to equal', '0.00%');
    });

    it('should handle 50 correctly', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatPercentage(50), 'to equal', '50.00%');
    });

    it('should handle 100 correctly', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatPercentage(100), 'to equal', '100.00%');
    });

    it('should handle fractional percentages', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatPercentage(0.5), 'to equal', '0.50%');
      expect(reporter.testFormatPercentage(33.3333), 'to equal', '33.33%');
    });

    it('should handle values over 100', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatPercentage(150), 'to equal', '150.00%');
    });

    it('should handle negative values', () => {
      const reporter = new TestReporter();

      expect(reporter.testFormatPercentage(-5), 'to equal', '-5.00%');
    });
  });
});

describe('ModestBenchReporterRegistry', () => {
  // Create a simple mock reporter for testing
  class MockReporter implements Reporter {
    constructor(public readonly name: string) {}

    async onEnd(_run: BenchmarkRun): Promise<void> {}

    async onError(_error: Error): Promise<void> {}

    async onFileEnd(_result: FileResult): Promise<void> {}

    async onFileStart(_file: string): Promise<void> {}

    async onProgress(_state: ProgressState): Promise<void> {}

    async onStart(_run: BenchmarkRun): Promise<void> {}

    async onSuiteEnd(_result: SuiteResult): Promise<void> {}

    async onSuiteStart(_suite: string): Promise<void> {}

    async onTaskResult(_result: TaskResult): Promise<void> {}

    async onTaskStart(_task: string): Promise<void> {}
  }

  describe('register()', () => {
    it('should register a reporter', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter = new MockReporter('test');

      registry.register('test', reporter);

      expect(registry.has('test'), 'to be true');
    });

    it('should throw error on duplicate registration', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test');
      const reporter2 = new MockReporter('test');

      registry.register('test', reporter1);

      expect(
        () => registry.register('test', reporter2),
        'to throw',
        /already registered/,
      );
    });

    it('should allow registering multiple different reporters', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');

      registry.register('test1', reporter1);
      registry.register('test2', reporter2);

      expect(registry.has('test1'), 'to be true');
      expect(registry.has('test2'), 'to be true');
    });
  });

  describe('get()', () => {
    it('should return reporter when found', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter = new MockReporter('test');

      registry.register('test', reporter);
      const retrieved = registry.get('test');

      expect(retrieved, 'to equal', reporter);
    });

    it('should return undefined when not found', () => {
      const registry = new ModestBenchReporterRegistry();

      const retrieved = registry.get('nonexistent');

      expect(retrieved, 'to be undefined');
    });
  });

  describe('getAll()', () => {
    it('should return all reporters', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');

      registry.register('test1', reporter1);
      registry.register('test2', reporter2);

      const all = registry.getAll();

      expect(Object.keys(all).length, 'to equal', 2);
      expect(all.test1, 'to equal', reporter1);
      expect(all.test2, 'to equal', reporter2);
    });

    it('should return empty object when no reporters', () => {
      const registry = new ModestBenchReporterRegistry();

      const all = registry.getAll();

      expect(Object.keys(all).length, 'to equal', 0);
    });
  });

  describe('getByNames()', () => {
    it('should return reporters for valid names', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');
      const reporter3 = new MockReporter('test3');

      registry.register('test1', reporter1);
      registry.register('test2', reporter2);
      registry.register('test3', reporter3);

      const reporters = registry.getByNames(['test1', 'test3']);

      expect(reporters.length, 'to equal', 2);
      expect(reporters, 'to contain', reporter1);
      expect(reporters, 'to contain', reporter3);
      expect(reporters, 'not to contain', reporter2);
    });

    it('should throw error for unknown reporter names', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter = new MockReporter('test1');

      registry.register('test1', reporter);

      expect(
        () => registry.getByNames(['test1', 'unknown']),
        'to throw',
        /Unknown reporters: unknown/,
      );
    });

    it('should list available reporters in error message', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');

      registry.register('test1', reporter1);
      registry.register('test2', reporter2);

      expect(
        () => registry.getByNames(['unknown']),
        'to throw',
        /Unknown reporters: unknown/,
      );
    });

    it('should handle multiple unknown reporters', () => {
      const registry = new ModestBenchReporterRegistry();

      expect(
        () => registry.getByNames(['unknown1', 'unknown2']),
        'to throw',
        /unknown1.*unknown2/,
      );
    });

    it('should return empty array for empty names list', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter = new MockReporter('test');

      registry.register('test', reporter);

      const reporters = registry.getByNames([]);

      expect(reporters.length, 'to equal', 0);
    });
  });

  describe('has()', () => {
    it('should return true for registered reporter', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter = new MockReporter('test');

      registry.register('test', reporter);

      expect(registry.has('test'), 'to be true');
    });

    it('should return false for unregistered reporter', () => {
      const registry = new ModestBenchReporterRegistry();

      expect(registry.has('nonexistent'), 'to be false');
    });
  });

  describe('unregister()', () => {
    it('should unregister a reporter', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter = new MockReporter('test');

      registry.register('test', reporter);
      const removed = registry.unregister('test');

      expect(removed, 'to be true');
      expect(registry.has('test'), 'to be false');
    });

    it('should return false when unregistering non-existent reporter', () => {
      const registry = new ModestBenchReporterRegistry();

      const removed = registry.unregister('nonexistent');

      expect(removed, 'to be false');
    });

    it('should allow re-registering after unregistering', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test');
      const reporter2 = new MockReporter('test');

      registry.register('test', reporter1);
      registry.unregister('test');

      // Should not throw
      registry.register('test', reporter2);

      expect(registry.get('test'), 'to equal', reporter2);
    });
  });

  describe('getNames()', () => {
    it('should return list of registered reporter names', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');
      const reporter3 = new MockReporter('test3');

      registry.register('test1', reporter1);
      registry.register('test2', reporter2);
      registry.register('test3', reporter3);

      const names = registry.getNames();

      expect(names.length, 'to equal', 3);
      expect(names, 'to contain', 'test1');
      expect(names, 'to contain', 'test2');
      expect(names, 'to contain', 'test3');
    });

    it('should return empty array when no reporters', () => {
      const registry = new ModestBenchReporterRegistry();

      const names = registry.getNames();

      expect(names.length, 'to equal', 0);
    });
  });

  describe('size()', () => {
    it('should return count of registered reporters', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');

      expect(registry.size(), 'to equal', 0);

      registry.register('test1', reporter1);
      expect(registry.size(), 'to equal', 1);

      registry.register('test2', reporter2);
      expect(registry.size(), 'to equal', 2);
    });

    it('should decrease when unregistering', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');

      registry.register('test1', reporter1);
      registry.register('test2', reporter2);

      expect(registry.size(), 'to equal', 2);

      registry.unregister('test1');

      expect(registry.size(), 'to equal', 1);
    });
  });

  describe('clear()', () => {
    it('should clear all reporters', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');

      registry.register('test1', reporter1);
      registry.register('test2', reporter2);

      registry.clear();

      expect(registry.size(), 'to equal', 0);
      expect(registry.has('test1'), 'to be false');
      expect(registry.has('test2'), 'to be false');
    });

    it('should allow registering after clear', () => {
      const registry = new ModestBenchReporterRegistry();
      const reporter1 = new MockReporter('test1');
      const reporter2 = new MockReporter('test2');

      registry.register('test1', reporter1);
      registry.clear();

      // Should not throw
      registry.register('test2', reporter2);

      expect(registry.size(), 'to equal', 1);
      expect(registry.has('test2'), 'to be true');
    });
  });
});
