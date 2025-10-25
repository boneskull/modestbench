/**
 * Visualization Utilities for History Formatters
 *
 * Pure functions for generating ASCII visualizations (sparklines, bar charts)
 * for trend analysis and performance distribution displays.
 */

import type { DistributionBucket } from '../../services/history/models.js';

/**
 * Generate bar chart histogram from distribution buckets
 *
 * @param distribution - Array of distribution buckets with counts
 * @param maxWidth - Maximum width of bars (default 20)
 * @returns Array of formatted bar chart lines
 */
export const generateBarChart = (
  distribution: DistributionBucket[],
  maxWidth = 20,
): string[] => {
  if (distribution.length === 0) {
    return [];
  }

  // Find maximum count for scaling
  const maxCount = Math.max(...distribution.map((b) => b.count));

  if (maxCount === 0) {
    return distribution.map((bucket) => `  ${bucket.label} (0 runs)`);
  }

  // Block characters for bar visualization
  const fullBlock = '█';
  const lightBlock = '░';

  return distribution.map((bucket) => {
    const ratio = bucket.count / maxCount;
    const barLength = Math.round(ratio * maxWidth);
    const fullBlocks = fullBlock.repeat(barLength);
    const emptyBlocks = lightBlock.repeat(maxWidth - barLength);

    return `  ${fullBlocks}${emptyBlocks} ${bucket.label} (${bucket.count} run${bucket.count !== 1 ? 's' : ''})`;
  });
};

/**
 * Generate ASCII sparkline from values
 *
 * @param values - Array of numeric values to visualize
 * @param width - Maximum width of sparkline (downsamples if needed)
 * @returns ASCII sparkline string using block characters
 */
export const generateSparkline = (values: number[], width?: number): string => {
  if (values.length === 0) {
    return '';
  }

  // Sparkline characters from lowest to highest
  const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  // Downsample if width is specified and values exceed it
  let processedValues = values;
  if (width && values.length > width) {
    const step = values.length / width;
    processedValues = [];
    for (let i = 0; i < width; i++) {
      const idx = Math.floor(i * step);
      processedValues.push(values[idx] ?? 0);
    }
  }

  // Find min and max for scaling
  const min = Math.min(...processedValues);
  const max = Math.max(...processedValues);
  const range = max - min;

  // Handle case where all values are the same
  if (range === 0) {
    return (sparkChars[4] ?? '▄').repeat(processedValues.length); // Use middle character
  }

  // Map each value to a sparkline character
  return processedValues
    .map((value) => {
      const normalized = (value - min) / range;
      const index = Math.min(
        Math.floor(normalized * sparkChars.length),
        sparkChars.length - 1,
      );
      return sparkChars[index] ?? '▄';
    })
    .join('');
};
