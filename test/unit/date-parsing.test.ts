import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import { parseDate } from '../../dist/services/history/query.js';

/**
 * Unit tests for date parsing functionality
 *
 * Tests various date formats including ISO 8601, relative expressions, and
 * shorthand formats used in history command options.
 */

describe('Date Parsing', () => {
  describe('ISO 8601 date strings', () => {
    it('should parse valid ISO 8601 date string', () => {
      const testDate = '2025-10-24T12:00:00.000Z';
      const result = parseDate(testDate);

      expect(result, 'to be a', Date);
      expect(result.toISOString(), 'to equal', testDate);
    });

    it('should parse ISO 8601 date without time', () => {
      const testDate = '2025-10-24';
      const result = parseDate(testDate);

      expect(result, 'to be a', Date);
      expect(result.getFullYear(), 'to equal', 2025);
      expect(result.getMonth(), 'to equal', 9); // October is month 9
      // getDate() returns UTC date, which may differ from local date depending on timezone
      // Just verify it's in the valid range
      expect(result.getDate(), 'to be greater than or equal to', 23);
      expect(result.getDate(), 'to be less than or equal to', 24);
    });
  });

  describe('Relative expressions', () => {
    it('should parse "1 day ago"', () => {
      const now = new Date();
      const result = parseDate('1 day ago');

      const expectedTime = now.getTime() - 24 * 60 * 60 * 1000;
      const tolerance = 1000; // 1 second tolerance for test execution time

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "3 days ago"', () => {
      const now = new Date();
      const result = parseDate('3 days ago');

      const expectedTime = now.getTime() - 3 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "1 week ago"', () => {
      const now = new Date();
      const result = parseDate('1 week ago');

      const expectedTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "2 weeks ago"', () => {
      const now = new Date();
      const result = parseDate('2 weeks ago');

      const expectedTime = now.getTime() - 14 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "1 month ago"', () => {
      const now = new Date();
      const result = parseDate('1 month ago');

      // Approximate: 30 days
      const expectedTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "2 hours ago"', () => {
      const now = new Date();
      const result = parseDate('2 hours ago');

      const expectedTime = now.getTime() - 2 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });
  });

  describe('Shorthand formats', () => {
    it('should parse "1d" (1 day ago)', () => {
      const now = new Date();
      const result = parseDate('1d');

      const expectedTime = now.getTime() - 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "2w" (2 weeks ago)', () => {
      const now = new Date();
      const result = parseDate('2w');

      const expectedTime = now.getTime() - 14 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "3m" (3 months ago)', () => {
      const now = new Date();
      const result = parseDate('3m');

      // Approximate: 90 days
      const expectedTime = now.getTime() - 90 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "6h" (6 hours ago)', () => {
      const now = new Date();
      const result = parseDate('6h');

      const expectedTime = now.getTime() - 6 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "30d" (30 days ago)', () => {
      const now = new Date();
      const result = parseDate('30d');

      const expectedTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });
  });

  describe('Case insensitivity', () => {
    it('should parse "1 DAY AGO" (uppercase)', () => {
      const now = new Date();
      const result = parseDate('1 DAY AGO');

      const expectedTime = now.getTime() - 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "2 Week Ago" (mixed case)', () => {
      const now = new Date();
      const result = parseDate('2 Week Ago');

      const expectedTime = now.getTime() - 14 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });

    it('should parse "5D" (uppercase shorthand)', () => {
      const now = new Date();
      const result = parseDate('5D');

      const expectedTime = now.getTime() - 5 * 24 * 60 * 60 * 1000;
      const tolerance = 1000;

      expect(
        Math.abs(result.getTime() - expectedTime),
        'to be less than',
        tolerance,
      );
    });
  });

  describe('Edge cases', () => {
    it('should throw error for invalid format', () => {
      expect(
        () => parseDate('invalid date'),
        'to throw',
        /Invalid date format/,
      );
    });

    it('should throw error for negative values', () => {
      expect(() => parseDate('-1 day ago'), 'to throw', /Invalid date format/);
    });

    it('should throw error for zero values', () => {
      expect(() => parseDate('0 days ago'), 'to throw', /Invalid date format/);
    });

    it('should throw error for malformed relative expression', () => {
      expect(() => parseDate('day ago'), 'to throw', /Invalid date format/);
    });

    it('should throw error for unknown time unit', () => {
      expect(() => parseDate('1 year ago'), 'to throw', /Invalid date format/);
    });

    it('should throw error for empty string', () => {
      expect(() => parseDate(''), 'to throw', /Invalid date format/);
    });
  });
});
