/**
 * History Query Service
 *
 * Handles querying benchmark run history with date parsing and filtering.
 */

import type {
  BenchmarkRun,
  HistoryQuery,
  HistoryStorage,
} from '../../types/index.js';

/**
 * Service for querying historical benchmark runs
 */
export class HistoryQueryService {
  constructor(private readonly storage: HistoryStorage) {}

  /**
   * Query runs with automatic date string parsing
   */
  async queryWithDateParsing(options: {
    limit?: number;
    pattern?: string;
    since?: string;
    tags?: string[];
    until?: string;
  }): Promise<BenchmarkRun[]> {
    // Build query object all at once
    const query: Partial<HistoryQuery> = {
      ...(options.since && { since: parseDate(options.since) }),
      ...(options.until && { until: parseDate(options.until) }),
      ...(options.pattern && { pattern: options.pattern }),
      ...(options.tags && options.tags.length > 0 && { tags: options.tags }),
      ...(options.limit && { limit: options.limit }),
    };

    return await this.storage.queryRuns(query);
  }
}

/**
 * Parse date string (ISO 8601 or relative)
 *
 * Supports:
 *
 * - ISO 8601: "2025-10-24T12:00:00Z", "2025-10-24"
 * - Relative: "1 day ago", "3 weeks ago", "2 hours ago"
 * - Shorthand: "1d", "2w", "3m", "6h"
 *
 * @param dateStr - Date string to parse
 * @returns Parsed Date object
 * @throws Error if date format is invalid
 */
export const parseDate = (dateStr: string): Date => {
  if (!dateStr || dateStr.trim() === '') {
    throw new Error(`Invalid date format: "${dateStr}"`);
  }

  // Try parsing as ISO 8601 first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Parse relative dates like "1 week ago", "3 days ago"
  const relativePattern = /^(\d+)\s+(hour|day|week|month)s?\s+ago$/i;
  const relativeMatch = dateStr.trim().match(relativePattern);

  if (relativeMatch && relativeMatch[1] && relativeMatch[2]) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();

    if (amount <= 0) {
      throw new Error(`Invalid date format: "${dateStr}"`);
    }

    const now = new Date();
    const msPerUnit: Record<string, number> = {
      day: 24 * 60 * 60 * 1000,
      hour: 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000, // Approximate
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const offset = amount * (msPerUnit[unit] || 0);
    return new Date(now.getTime() - offset);
  }

  // Parse shorthand formats like "1d", "2w", "3m", "6h"
  // cspell:ignore hdwm
  const shorthandPattern = /^(\d+)([hdwm])$/i;
  const shorthandMatch = dateStr.trim().match(shorthandPattern);

  if (shorthandMatch && shorthandMatch[1] && shorthandMatch[2]) {
    const amount = parseInt(shorthandMatch[1], 10);
    const unit = shorthandMatch[2].toLowerCase();

    if (amount <= 0) {
      throw new Error(`Invalid date format: "${dateStr}"`);
    }

    const now = new Date();
    const msPerUnit: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 30 * 24 * 60 * 60 * 1000, // Approximate month
      w: 7 * 24 * 60 * 60 * 1000,
    };

    const offset = amount * (msPerUnit[unit] || 0);
    return new Date(now.getTime() - offset);
  }

  throw new Error(`Invalid date format: "${dateStr}"`);
};
