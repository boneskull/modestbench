/**
 * Base Formatter Interface
 *
 * Defines the contract for history command formatters. Each formatter
 * transforms processed data into human-readable or machine-readable output.
 */

/**
 * Formatter interface for history command output
 *
 * @template TData - The data type this formatter accepts
 */
export interface HistoryFormatter<TData> {
  /**
   * Format data as CSV (optional, not all commands support CSV)
   */
  formatCsv?(data: TData): string;

  /**
   * Format data for human-readable terminal output
   */
  formatHuman(data: TData): string;

  /**
   * Format data as JSON
   */
  formatJson(data: TData): string;
}
