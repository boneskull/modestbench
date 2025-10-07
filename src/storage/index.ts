/**
 * ModestBench Storage
 * 
 * Export storage implementations and related types.
 */

export { FileHistoryStorage } from './history.js';

// Re-export types for convenience
export type {
  HistoryStorage,
  HistoryQuery,
  RetentionPolicy,
  CleanupResult,
} from '../types/index.js';