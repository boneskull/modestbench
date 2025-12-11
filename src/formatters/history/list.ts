/**
 * List Formatter
 *
 * Formats historical run listings in human, JSON, and CSV formats.
 */

import type { HistoryListResult } from '../../services/history/models.js';
import type { HistoryFormatter } from './base.js';

import { ansiChars, colorize } from '../../utils/ansi.js';

/**
 * Formatter for history list command
 */
export class HistoryListFormatter implements HistoryFormatter<HistoryListResult> {
  /**
   * Format as CSV
   */
  formatCsv(data: HistoryListResult): string {
    const lines: string[] = ['id,startTime,duration,files,tasks,passed,failed'];

    for (const run of data.runs) {
      lines.push(
        `${run.id},${run.startTime.toISOString()},${run.duration},${run.summary.totalFiles},${run.summary.totalTasks},${run.summary.passedTasks},${run.summary.failedTasks}`,
      );
    }

    return lines.join('\n');
  }

  /**
   * Format as human-readable list
   */
  formatHuman(data: HistoryListResult): string {
    if (data.runs.length === 0) {
      return colorize('dim', 'No historical data found matching criteria.');
    }

    const lines: string[] = [
      colorize('brightMagenta', colorize('bold', '\nRecent Benchmark Runs')),
      '',
    ];

    for (const run of data.runs) {
      const dateStr = run.startTime.toLocaleString();
      const durationStr = `${(run.duration / 1000).toFixed(1)}s`;

      // Status with colors and symbols
      const hasFailures = run.summary.failedTasks > 0;
      const statusIcon = hasFailures
        ? colorize('brightRed', ansiChars.cross)
        : colorize('brightCyan', ansiChars.checkmark);

      const passedStr = colorize(
        'brightCyan',
        `${run.summary.passedTasks} passed`,
      );
      const statusStr = hasFailures
        ? `${passedStr}, ${colorize('brightRed', `${run.summary.failedTasks} failed`)}`
        : passedStr;

      // Run ID in bright white and bold, date dimmed, duration in magenta
      lines.push(
        `  ${statusIcon} ${colorize('brightWhite', colorize('bold', run.id))} ${colorize('dim', ansiChars.bullet)} ${colorize('gray', dateStr)} ${colorize('dim', ansiChars.bullet)} ${colorize('brightMagenta', durationStr)}`,
      );

      // Files and tasks info
      lines.push(
        `     ${colorize('dim', `${run.summary.totalFiles} files, ${run.summary.totalTasks} tasks:`)} ${statusStr}`,
      );
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format as JSON array
   */
  formatJson(data: HistoryListResult): string {
    if (data.runs.length === 0) {
      return '[]';
    }

    return JSON.stringify(
      data.runs.map((run) => ({
        duration: run.duration,
        failed: run.summary.failedTasks,
        files: run.summary.totalFiles,
        id: run.id,
        passed: run.summary.passedTasks,
        startTime: run.startTime,
        tasks: run.summary.totalTasks,
      })),
      null,
      2,
    );
  }
}
