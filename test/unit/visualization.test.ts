import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type { DistributionBucket } from '../../dist/services/history/models.js';

import {
  generateBarChart,
  generateSparkline,
} from '../../dist/formatters/history/visualization.js';
import { colorize } from '../../dist/utils/ansi.js';

/**
 * Unit tests for visualization helpers
 *
 * Tests ASCII sparklines, bar chart histograms, and color application
 */

describe('Visualization', () => {
  describe('generateSparkline', () => {
    it('should generate sparkline for ascending values', () => {
      const values = [1, 2, 3, 4, 5];
      const sparkline = generateSparkline(values);

      // Should use sparkline characters: ▁▂▃▄▅▆▇█
      expect(sparkline, 'to be a', 'string');
      expect(sparkline.length, 'to be greater than', 0);
      expect(sparkline, 'to match', /[▁▂▃▄▅▆▇█]/);
    });

    it('should generate sparkline for descending values', () => {
      const values = [5, 4, 3, 2, 1];
      const sparkline = generateSparkline(values);

      expect(sparkline, 'to be a', 'string');
      expect(sparkline.length, 'to be greater than', 0);
      expect(sparkline, 'to match', /[▁▂▃▄▅▆▇█]/);
    });

    it('should handle single value', () => {
      const values = [100];
      const sparkline = generateSparkline(values);

      expect(sparkline, 'to be a', 'string');
      expect(sparkline.length, 'to be greater than', 0);
    });

    it('should handle identical values', () => {
      const values = [5, 5, 5, 5, 5];
      const sparkline = generateSparkline(values);

      expect(sparkline, 'to be a', 'string');
      // All values should map to same character
      const uniqueChars = new Set(sparkline.split(''));
      expect(uniqueChars.size, 'to equal', 1);
    });

    it('should respect width parameter', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sparkline = generateSparkline(values, 5);

      expect(sparkline.length, 'to equal', 5);
    });

    it('should handle empty array', () => {
      const values: number[] = [];
      const sparkline = generateSparkline(values);

      expect(sparkline, 'to equal', '');
    });

    it('should handle very large range', () => {
      const values = [1, 1000];
      const sparkline = generateSparkline(values);

      expect(sparkline, 'to be a', 'string');
      expect(sparkline.length, 'to equal', 2);
    });
  });

  describe('generateBarChart', () => {
    it('should generate bar chart for distribution', () => {
      const distribution = [
        { count: 10, label: '0-10ms', max: 10, min: 0 },
        { count: 20, label: '10-20ms', max: 20, min: 10 },
        { count: 15, label: '20-30ms', max: 30, min: 20 },
      ];

      const chart = generateBarChart(distribution);

      expect(chart, 'to be an', 'array');
      expect(chart.length, 'to equal', 3);

      // Each line should have blocks
      for (const line of chart) {
        expect(line, 'to match', /█|▓|▒|░/);
      }
    });

    it('should scale bars relative to maximum', () => {
      const distribution = [
        { count: 5, label: 'Small', max: 10, min: 0 },
        { count: 20, label: 'Large', max: 20, min: 10 },
      ];

      const chart = generateBarChart(distribution, 20);

      expect(chart.length, 'to equal', 2);

      // The larger count should have more blocks
      const smallBlocks = (chart[0]?.match(/█/g) || []).length;
      const largeBlocks = (chart[1]?.match(/█/g) || []).length;

      expect(largeBlocks, 'to be greater than', smallBlocks);
    });

    it('should handle single entry', () => {
      const distribution = [{ count: 10, label: 'Only', max: 10, min: 0 }];

      const chart = generateBarChart(distribution);

      expect(chart.length, 'to equal', 1);
    });

    it('should handle empty distribution', () => {
      const distribution: DistributionBucket[] = [];

      const chart = generateBarChart(distribution);

      expect(chart.length, 'to equal', 0);
    });

    it('should respect maxWidth parameter', () => {
      const distribution = [{ count: 100, label: 'Test', max: 10, min: 0 }];

      const chart = generateBarChart(distribution, 10);

      // Should not exceed max width (accounting for label and spacing)
      expect(chart[0]!.length, 'to be less than or equal to', 50);
    });

    it('should handle zero counts', () => {
      const distribution = [
        { count: 0, label: 'Empty', max: 10, min: 0 },
        { count: 10, label: 'Full', max: 20, min: 10 },
      ];

      const chart = generateBarChart(distribution);

      expect(chart.length, 'to equal', 2);
    });
  });

  describe('colorize', () => {
    it('should apply ANSI color codes', () => {
      const text = 'Hello';
      const colored = colorize('brightMagenta', text);

      // Should contain ANSI escape codes
      expect(colored, 'to contain', '\x1b[');
      expect(colored, 'to contain', text);
    });

    it('should handle multiple colors', () => {
      const colors = [
        'brightMagenta',
        'brightCyan',
        'brightBlue',
        'cyan',
        'magenta',
        'red',
        'gray',
        'dim',
      ] as const;

      for (const color of colors) {
        const colored = colorize(color, 'test');
        expect(colored, 'to contain', '\x1b[');
      }
    });

    it('should preserve text content', () => {
      const text = 'Important message';
      const colored = colorize('red', text);

      expect(colored, 'to contain', text);
    });

    it('should handle empty text', () => {
      const colored = colorize('brightMagenta', '');

      expect(colored, 'to be a', 'string');
    });

    it('should reset color at end', () => {
      const colored = colorize('brightMagenta', 'test');

      // Should end with reset code
      expect(colored, 'to contain', '\x1b[0m');
    });
  });

  describe('Integration', () => {
    it('should combine sparkline with colors', () => {
      const values = [1, 2, 3, 4, 5];
      const sparkline = generateSparkline(values);
      const colored = colorize('brightCyan', sparkline);

      expect(colored, 'to contain', '\x1b[');
      expect(colored, 'to match', /[▁▂▃▄▅▆▇█]/);
    });

    it('should combine bar chart with colors', () => {
      const distribution = [{ count: 10, label: 'Test', max: 10, min: 0 }];
      const chart = generateBarChart(distribution);
      const colored = chart.map((line) => colorize('brightMagenta', line));

      expect(colored.length, 'to equal', 1);
      expect(colored[0], 'to contain', '\x1b[');
    });
  });
});
