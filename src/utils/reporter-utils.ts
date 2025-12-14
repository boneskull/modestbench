/**
 * ModestBench Reporter Utilities
 *
 * Formatting functions for benchmark data, exported for use by third-party
 * reporter plugins.
 */

import type { ReporterUtils } from '../types/plugin.js';

/**
 * Format bytes in human-readable format
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 GB", "256 MB", "1.2 KB")
 */
export const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Format duration in human-readable format
 *
 * @param nanoseconds - Duration in nanoseconds
 * @returns Formatted string (e.g., "1.23ms", "456.78μs", "789.00ns")
 */
export const formatDuration = (nanoseconds: number): string => {
  if (nanoseconds < 1000) {
    return `${nanoseconds.toFixed(2)}ns`;
  } else if (nanoseconds < 1_000_000) {
    return `${(nanoseconds / 1000).toFixed(2)}μs`;
  } else if (nanoseconds < 1_000_000_000) {
    return `${(nanoseconds / 1_000_000).toFixed(2)}ms`;
  } else {
    return `${(nanoseconds / 1_000_000_000).toFixed(2)}s`;
  }
};

/**
 * Format operations per second in human-readable format
 *
 * @param opsPerSecond - Operations per second
 * @returns Formatted string (e.g., "1.2M ops/sec", "456K ops/sec")
 */
export const formatOpsPerSecond = (opsPerSecond: number): string => {
  if (opsPerSecond < 1000) {
    return `${opsPerSecond.toFixed(2)} ops/sec`;
  } else if (opsPerSecond < 1_000_000) {
    return `${(opsPerSecond / 1000).toFixed(2)}K ops/sec`;
  } else if (opsPerSecond < 1_000_000_000) {
    return `${(opsPerSecond / 1_000_000).toFixed(2)}M ops/sec`;
  } else {
    return `${(opsPerSecond / 1_000_000_000).toFixed(2)}B ops/sec`;
  }
};

/**
 * Format percentage value
 *
 * @param value - Percentage value (e.g., 12.345 for 12.345%)
 * @returns Formatted string (e.g., "12.35%")
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

/**
 * Reporter utilities object implementing the ReporterUtils interface
 *
 * This object is provided to reporter plugins via the ReporterContext.
 */
export const reporterUtils: ReporterUtils = {
  formatBytes,
  formatDuration,
  formatOpsPerSecond,
  formatPercentage,
};
