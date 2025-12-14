import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import {
  formatBytes,
  formatDuration,
  formatOpsPerSecond,
  formatPercentage,
  reporterUtils,
} from '../../../src/utils/reporter-utils.js';

describe('reporter-utils', () => {
  describe('formatBytes()', () => {
    it('should format bytes (< 1KB)', () => {
      expect(formatBytes(0), 'to equal', '0.0 B');
      expect(formatBytes(1), 'to equal', '1.0 B');
      expect(formatBytes(500), 'to equal', '500.0 B');
      expect(formatBytes(1023), 'to equal', '1023.0 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024), 'to equal', '1.0 KB');
      expect(formatBytes(1536), 'to equal', '1.5 KB');
      expect(formatBytes(10240), 'to equal', '10.0 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024), 'to equal', '1.0 MB');
      expect(formatBytes(1024 * 1024 * 1.5), 'to equal', '1.5 MB');
      expect(formatBytes(256 * 1024 * 1024), 'to equal', '256.0 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024), 'to equal', '1.0 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 1.5), 'to equal', '1.5 GB');
    });

    it('should format terabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024), 'to equal', '1.0 TB');
      expect(
        formatBytes(1024 * 1024 * 1024 * 1024 * 2.5),
        'to equal',
        '2.5 TB',
      );
    });

    it('should cap at terabytes for very large values', () => {
      // 10 petabytes would be 10240 TB
      expect(
        formatBytes(1024 * 1024 * 1024 * 1024 * 10240),
        'to equal',
        '10240.0 TB',
      );
    });
  });

  describe('formatDuration()', () => {
    it('should format nanoseconds (< 1000ns)', () => {
      expect(formatDuration(0), 'to equal', '0.00ns');
      expect(formatDuration(1), 'to equal', '1.00ns');
      expect(formatDuration(500), 'to equal', '500.00ns');
      expect(formatDuration(999), 'to equal', '999.00ns');
    });

    it('should format microseconds (< 1ms)', () => {
      expect(formatDuration(1000), 'to equal', '1.00μs');
      expect(formatDuration(1500), 'to equal', '1.50μs');
      expect(formatDuration(999_999), 'to equal', '1000.00μs');
    });

    it('should format milliseconds (< 1s)', () => {
      expect(formatDuration(1_000_000), 'to equal', '1.00ms');
      expect(formatDuration(1_500_000), 'to equal', '1.50ms');
      expect(formatDuration(999_999_999), 'to equal', '1000.00ms');
    });

    it('should format seconds (>= 1s)', () => {
      expect(formatDuration(1_000_000_000), 'to equal', '1.00s');
      expect(formatDuration(1_500_000_000), 'to equal', '1.50s');
      expect(formatDuration(60_000_000_000), 'to equal', '60.00s');
    });

    it('should handle fractional nanoseconds', () => {
      expect(formatDuration(1.5), 'to equal', '1.50ns');
      expect(formatDuration(123.456), 'to equal', '123.46ns');
    });
  });

  describe('formatOpsPerSecond()', () => {
    it('should format ops/sec (< 1K)', () => {
      expect(formatOpsPerSecond(0), 'to equal', '0.00 ops/sec');
      expect(formatOpsPerSecond(1), 'to equal', '1.00 ops/sec');
      expect(formatOpsPerSecond(500), 'to equal', '500.00 ops/sec');
      expect(formatOpsPerSecond(999), 'to equal', '999.00 ops/sec');
    });

    it('should format thousands (K)', () => {
      expect(formatOpsPerSecond(1000), 'to equal', '1.00K ops/sec');
      expect(formatOpsPerSecond(1500), 'to equal', '1.50K ops/sec');
      expect(formatOpsPerSecond(456_000), 'to equal', '456.00K ops/sec');
    });

    it('should format millions (M)', () => {
      expect(formatOpsPerSecond(1_000_000), 'to equal', '1.00M ops/sec');
      expect(formatOpsPerSecond(1_500_000), 'to equal', '1.50M ops/sec');
      expect(formatOpsPerSecond(123_456_789), 'to equal', '123.46M ops/sec');
    });

    it('should format billions (B)', () => {
      expect(formatOpsPerSecond(1_000_000_000), 'to equal', '1.00B ops/sec');
      expect(formatOpsPerSecond(1_500_000_000), 'to equal', '1.50B ops/sec');
    });

    it('should handle fractional values', () => {
      expect(formatOpsPerSecond(0.5), 'to equal', '0.50 ops/sec');
      expect(formatOpsPerSecond(123.456), 'to equal', '123.46 ops/sec');
    });
  });

  describe('formatPercentage()', () => {
    it('should format percentages with 2 decimal places', () => {
      expect(formatPercentage(0), 'to equal', '0.00%');
      expect(formatPercentage(100), 'to equal', '100.00%');
      expect(formatPercentage(12.345), 'to equal', '12.35%');
      expect(formatPercentage(99.999), 'to equal', '100.00%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-5.5), 'to equal', '-5.50%');
      expect(formatPercentage(-100), 'to equal', '-100.00%');
    });

    it('should handle percentages over 100', () => {
      expect(formatPercentage(150), 'to equal', '150.00%');
      expect(formatPercentage(1234.56), 'to equal', '1234.56%');
    });

    it('should round correctly', () => {
      expect(formatPercentage(12.344), 'to equal', '12.34%');
      expect(formatPercentage(12.345), 'to equal', '12.35%'); // rounds up at .5
      expect(formatPercentage(12.346), 'to equal', '12.35%');
    });
  });

  describe('reporterUtils object', () => {
    it('should export all formatting functions', () => {
      expect(reporterUtils.formatBytes, 'to be', formatBytes);
      expect(reporterUtils.formatDuration, 'to be', formatDuration);
      expect(reporterUtils.formatOpsPerSecond, 'to be', formatOpsPerSecond);
      expect(reporterUtils.formatPercentage, 'to be', formatPercentage);
    });

    it('should have the correct shape', () => {
      expect(Object.keys(reporterUtils).sort(), 'to deeply equal', [
        'formatBytes',
        'formatDuration',
        'formatOpsPerSecond',
        'formatPercentage',
      ]);
    });
  });
});
