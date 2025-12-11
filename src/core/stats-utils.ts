/**
 * Statistical utility functions for benchmark result analysis
 *
 * Provides IQR-based outlier removal and comprehensive statistics calculation
 * adapted from bench-node's StatisticalHistogram.
 */

/**
 * Statistics computed from sample data
 */
export interface SampleStatistics {
  /** Coefficient of variation (stdDev/mean × 100) */
  readonly cv: number;
  /** Relative margin of error at 95% confidence (as percentage) */
  readonly marginOfError: number;
  /** Maximum value */
  readonly max: number;
  /** Mean (average) value */
  readonly mean: number;
  /** Minimum value */
  readonly min: number;
  /** 95th percentile */
  readonly p95: number;
  /** 99th percentile */
  readonly p99: number;
  /** Standard deviation */
  readonly stdDev: number;
  /** Variance */
  readonly variance: number;
}

/**
 * Calculate comprehensive statistics from samples
 *
 * Adapted from bench-node's StatisticalHistogram. Assumes samples are already
 * sorted (e.g., from removeOutliersIQR output).
 *
 * @param samples - Sample values (should be sorted for accurate percentiles)
 * @returns Computed statistics
 */
export const calculateStatistics = (samples: number[]): SampleStatistics => {
  if (samples.length === 0) {
    return {
      cv: 0,
      marginOfError: 0,
      max: 0,
      mean: 0,
      min: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      variance: 0,
    };
  }

  // Min/Max (samples are already sorted from removeOutliersIQR)
  const min = samples[0]!;
  const max = samples[samples.length - 1]!;

  // Mean
  const mean =
    samples.length === 1
      ? samples[0]!
      : samples.reduce(
          (acc, v) => Math.min(Number.MAX_SAFE_INTEGER, acc + v),
          0,
        ) / samples.length;

  // Standard deviation and variance
  let stdDev = 0;
  let variance = 0;
  if (samples.length >= 2) {
    variance =
      samples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
      (samples.length - 1);
    stdDev = Math.sqrt(variance);
  }

  // Coefficient of Variation
  const cv = mean === 0 || samples.length < 2 ? 0 : (stdDev / mean) * 100;

  // Relative Margin of Error (95% confidence) - as percentage
  // Formula: (Z * stdDev / sqrt(n)) / mean * 100
  const Z = 1.96;
  const absoluteMoe =
    samples.length === 0 ? 0 : (Z * stdDev) / Math.sqrt(samples.length);
  const marginOfError = mean === 0 ? 0 : (absoluteMoe / mean) * 100;

  // Percentiles (using standard formula: floor((n-1) * p))
  const p95 = samples[Math.floor((samples.length - 1) * 0.95)] ?? 0;
  const p99 = samples[Math.floor((samples.length - 1) * 0.99)] ?? 0;

  return { cv, marginOfError, max, mean, min, p95, p99, stdDev, variance };
};

/**
 * Remove outliers using Interquartile Range (IQR) method
 *
 * Adapted from bench-node's StatisticalHistogram.removeOutliers. Filters values
 * outside [Q1 - 1.5×IQR, Q3 + 1.5×IQR] range.
 *
 * @param samples - Raw sample values (will be sorted internally)
 * @returns Filtered samples with outliers removed
 */
export const removeOutliersIQR = (samples: number[]): number[] => {
  if (samples.length < 4) {
    return samples;
  }

  const sorted = samples.slice().sort((a, b) => a - b);

  // Calculate Q1 and Q3
  let q1: number;
  let q3: number;
  const size = sorted.length;

  if (((size - 1) / 4) % 1 === 0 || (size / 4) % 1 === 0) {
    q1 =
      (1 / 2) *
      (sorted[Math.floor(size / 4) - 1]! + sorted[Math.floor(size / 4)]!);
    q3 =
      (1 / 2) *
      (sorted[Math.ceil((size * 3) / 4) - 1]! +
        sorted[Math.ceil((size * 3) / 4)]!);
  } else {
    q1 = sorted[Math.floor(size / 4)]!;
    q3 = sorted[Math.floor((size * 3) / 4)]!;
  }

  // Calculate IQR and bounds
  const iqr = q3 - q1;
  const minValue = q1 - iqr * 1.5;
  const maxValue = q3 + iqr * 1.5;

  // Filter outliers
  return sorted.filter((value) => value <= maxValue && value >= minValue);
};
