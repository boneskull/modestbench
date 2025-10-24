import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import {
  calculatePercentChange,
  calculateStatistics,
  calculateTrend,
  detectRegression,
  type TrendData,
  type TrendDataPoint,
} from '../../dist/cli/commands/history.js';

/**
 * Unit tests for trend analysis functionality
 *
 * Tests trend calculation, statistical metrics, regression detection, and
 * handling of edge cases.
 */

describe('Trend Analysis', () => {
  describe('calculateStatistics', () => {
    it('should calculate mean correctly', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 200 },
        { date: new Date('2025-01-03'), mean: 300 },
      ];

      const stats = calculateStatistics(dataPoints);
      expect(stats.mean, 'to equal', 200);
    });

    it('should calculate median correctly for odd number of points', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 200 },
        { date: new Date('2025-01-03'), mean: 300 },
      ];

      const stats = calculateStatistics(dataPoints);
      expect(stats.median, 'to equal', 200);
    });

    it('should calculate median correctly for even number of points', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 200 },
        { date: new Date('2025-01-03'), mean: 300 },
        { date: new Date('2025-01-04'), mean: 400 },
      ];

      const stats = calculateStatistics(dataPoints);
      expect(stats.median, 'to equal', 250);
    });

    it('should calculate variance and standard deviation', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 200 },
        { date: new Date('2025-01-03'), mean: 300 },
      ];

      const stats = calculateStatistics(dataPoints);

      // Variance = average of squared differences from mean
      // Mean = 200, so differences are: -100, 0, 100
      // Squared: 10000, 0, 10000
      // Variance = (10000 + 0 + 10000) / 3 = 6666.67
      expect(stats.variance, 'to be close to', 6666.67, 0.1);

      // Standard deviation = sqrt(variance)
      expect(stats.stdDeviation, 'to be close to', 81.65, 0.1);
    });

    it('should handle single data point', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
      ];

      const stats = calculateStatistics(dataPoints);
      expect(stats.mean, 'to equal', 100);
      expect(stats.median, 'to equal', 100);
      expect(stats.variance, 'to equal', 0);
      expect(stats.stdDeviation, 'to equal', 0);
    });
  });

  describe('calculateTrend', () => {
    it('should detect improving trend (values decreasing, performance improving)', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 300 },
        { date: new Date('2025-01-02'), mean: 250 },
        { date: new Date('2025-01-03'), mean: 200 },
        { date: new Date('2025-01-04'), mean: 150 },
      ];

      const trend = calculateTrend(dataPoints);
      expect(trend, 'to equal', 'improving');
    });

    it('should detect degrading trend (values increasing, performance degrading)', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 150 },
        { date: new Date('2025-01-03'), mean: 200 },
        { date: new Date('2025-01-04'), mean: 250 },
      ];

      const trend = calculateTrend(dataPoints);
      expect(trend, 'to equal', 'degrading');
    });

    it('should detect stable trend (minimal variation)', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 200 },
        { date: new Date('2025-01-02'), mean: 201 },
        { date: new Date('2025-01-03'), mean: 199 },
        { date: new Date('2025-01-04'), mean: 200 },
      ];

      const trend = calculateTrend(dataPoints);
      expect(trend, 'to equal', 'stable');
    });

    it('should handle single data point as stable', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
      ];

      const trend = calculateTrend(dataPoints);
      expect(trend, 'to equal', 'stable');
    });

    it('should handle two data points', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 80 },
      ];

      const trend = calculateTrend(dataPoints);
      expect(trend, 'to equal', 'improving');
    });
  });

  describe('calculatePercentChange', () => {
    it('should calculate percent change from first to last', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 150 },
        { date: new Date('2025-01-03'), mean: 200 },
      ];

      const percentChange = calculatePercentChange(dataPoints);
      // Change from 100 to 200 = 100% increase
      expect(percentChange, 'to equal', 100);
    });

    it('should calculate negative percent change', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 200 },
        { date: new Date('2025-01-02'), mean: 150 },
        { date: new Date('2025-01-03'), mean: 100 },
      ];

      const percentChange = calculatePercentChange(dataPoints);
      // Change from 200 to 100 = -50% decrease
      expect(percentChange, 'to equal', -50);
    });

    it('should return 0 for single data point', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
      ];

      const percentChange = calculatePercentChange(dataPoints);
      expect(percentChange, 'to equal', 0);
    });

    it('should handle very small changes', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 100.5 },
      ];

      const percentChange = calculatePercentChange(dataPoints);
      expect(percentChange, 'to be close to', 0.5, 0.01);
    });
  });

  describe('detectRegression', () => {
    it('should detect regression when change exceeds positive threshold', () => {
      const trendData: TrendData = {
        confidence: 95,
        dataPoints: [
          { date: new Date('2025-01-01'), mean: 100 },
          { date: new Date('2025-01-02'), mean: 120 },
        ],
        percentChange: 20,
        runs: 2,
        statistics: {
          mean: 110,
          median: 110,
          stdDeviation: 10,
          variance: 100,
        },
        task: 'test-task',
        trend: 'degrading',
      };

      const isRegression = detectRegression(trendData, 10);
      expect(isRegression, 'to be', true);
    });

    it('should not detect regression when change is below threshold', () => {
      const trendData: TrendData = {
        confidence: 95,
        dataPoints: [
          { date: new Date('2025-01-01'), mean: 100 },
          { date: new Date('2025-01-02'), mean: 105 },
        ],
        percentChange: 5,
        runs: 2,
        statistics: {
          mean: 102.5,
          median: 102.5,
          stdDeviation: 2.5,
          variance: 6.25,
        },
        task: 'test-task',
        trend: 'stable',
      };

      const isRegression = detectRegression(trendData, 10);
      expect(isRegression, 'to be', false);
    });

    it('should not detect regression for improving trends', () => {
      const trendData: TrendData = {
        confidence: 95,
        dataPoints: [
          { date: new Date('2025-01-01'), mean: 100 },
          { date: new Date('2025-01-02'), mean: 80 },
        ],
        percentChange: -20,
        runs: 2,
        statistics: {
          mean: 90,
          median: 90,
          stdDeviation: 10,
          variance: 100,
        },
        task: 'test-task',
        trend: 'improving',
      };

      const isRegression = detectRegression(trendData, 10);
      expect(isRegression, 'to be', false);
    });

    it('should handle edge case with exact threshold match', () => {
      const trendData: TrendData = {
        confidence: 95,
        dataPoints: [
          { date: new Date('2025-01-01'), mean: 100 },
          { date: new Date('2025-01-02'), mean: 110 },
        ],
        percentChange: 10,
        runs: 2,
        statistics: {
          mean: 105,
          median: 105,
          stdDeviation: 5,
          variance: 25,
        },
        task: 'test-task',
        trend: 'degrading',
      };

      const isRegression = detectRegression(trendData, 10);
      expect(isRegression, 'to be', true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty data points array', () => {
      const dataPoints: TrendDataPoint[] = [];

      expect(() => calculateStatistics(dataPoints), 'to throw', /empty/i);
    });

    it('should handle data points with identical values', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 100 },
        { date: new Date('2025-01-02'), mean: 100 },
        { date: new Date('2025-01-03'), mean: 100 },
      ];

      const stats = calculateStatistics(dataPoints);
      expect(stats.mean, 'to equal', 100);
      expect(stats.variance, 'to equal', 0);
      expect(stats.stdDeviation, 'to equal', 0);

      const trend = calculateTrend(dataPoints);
      expect(trend, 'to equal', 'stable');
    });

    it('should handle very large numbers', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 1000000000 },
        { date: new Date('2025-01-02'), mean: 2000000000 },
      ];

      const stats = calculateStatistics(dataPoints);
      expect(stats.mean, 'to equal', 1500000000);
    });

    it('should handle very small numbers', () => {
      const dataPoints: TrendDataPoint[] = [
        { date: new Date('2025-01-01'), mean: 0.001 },
        { date: new Date('2025-01-02'), mean: 0.002 },
      ];

      const percentChange = calculatePercentChange(dataPoints);
      expect(percentChange, 'to equal', 100);
    });
  });
});
