/**
 * Show Formatter
 *
 * Formats detailed benchmark run display in human and JSON formats.
 */

import { relative } from 'node:path';

import type { ShowResult } from '../../services/history/models.js';
import type { HistoryFormatter } from './base.js';

import { ansiChars, colorize } from '../../utils/ansi.js';

/**
 * Formatter for history show command
 */
export class HistoryShowFormatter implements HistoryFormatter<ShowResult> {
  /**
   * Format as human-readable detailed view
   */
  formatHuman(data: ShowResult): string {
    const lines: string[] = [];

    // Header with run ID
    lines.push(
      colorize(
        'cyan',
        colorize(
          'bold',
          `\nBenchmark Run: ${colorize('brightWhite', colorize('bold', data.id))}`,
        ),
      ),
    );

    // Run details (indented by 2 spaces)
    lines.push(
      `  ${colorize('brightCyan', ansiChars.bullet)} ${colorize('white', data.startTime.toLocaleString())}`,
    );
    lines.push(
      `  ${colorize('brightCyan', ansiChars.bullet)} ${colorize('white', 'Duration:')} ${colorize('magenta', `${(data.duration / 1000).toFixed(1)}s`)}`,
    );
    lines.push(
      `  ${colorize('brightCyan', ansiChars.bullet)} Node.js ${colorize('brightWhite', data.environment.nodeVersion)} on ${colorize('brightWhite', data.environment.platform)} (${colorize('brightWhite', data.environment.arch)})`,
    );

    // CPU and system info
    lines.push(
      `  ${colorize('brightCyan', ansiChars.bullet)} ${colorize('brightWhite', String(data.environment.cpu.cores))} cores @ ${colorize('brightWhite', `${data.environment.cpu.speed}MHz`)} on ${colorize('brightWhite', data.environment.cpu.model)}`,
    );

    if (data.git) {
      lines.push(
        `  ${colorize('brightCyan', ansiChars.bullet)} ${colorize('brightBlue', data.git.branch)}@${colorize('dim', data.git.commit.substring(0, 8))}`,
      );
    }

    // Summary section
    lines.push('');
    lines.push(colorize('cyan', 'Summary'));
    lines.push(
      `  ${colorize('dim', ansiChars.smallSquare)} Files: ${colorize('brightWhite', String(data.summary.totalFiles))}`,
    );
    lines.push(
      `  ${colorize('dim', ansiChars.smallSquare)} Suites: ${colorize('brightWhite', String(data.summary.totalSuites))}`,
    );
    lines.push(
      `  ${colorize('dim', ansiChars.smallSquare)} Tasks: ${colorize('brightWhite', String(data.summary.totalTasks))}`,
    );

    lines.push(
      `  ${colorize('dim', ansiChars.smallSquare)} Passed: ${colorize('brightCyan', String(data.summary.passedTasks))}`,
    );

    if (data.summary.failedTasks > 0) {
      lines.push(
        `  ${colorize('dim', ansiChars.smallSquare)} Failed: ${colorize('brightRed', colorize('bold', String(data.summary.failedTasks)))}`,
      );
    }

    // Detailed results
    lines.push('');
    lines.push(colorize('cyan', 'Results'));
    lines.push('');

    for (const file of data.files) {
      // Display filepath as relative if within cwd, otherwise absolute
      const displayPath = relative(process.cwd(), file.filePath);
      const finalPath = displayPath.startsWith('..')
        ? file.filePath
        : displayPath;

      lines.push(
        `${colorize('dim', ansiChars.bullet)} ${colorize('brightMagenta', colorize('bold', finalPath))}`,
      );

      for (const suite of file.suites) {
        lines.push(
          `  ${colorize('dim', ansiChars.bullet)} ${colorize('brightWhite', suite.name)}`,
        );

        for (const task of suite.tasks) {
          const statusIcon = task.error
            ? colorize('brightRed', ansiChars.cross)
            : colorize('brightCyan', ansiChars.checkmark);

          if (task.error) {
            lines.push(
              `    ${statusIcon} ${colorize('white', task.name)} ${colorize('dim', ansiChars.bullet)} ${colorize('brightRed', 'failed')}`,
            );
          } else {
            const mean = formatTime(task.mean);
            const opsStr = task.opsPerSecond.toLocaleString('en-US', {
              maximumFractionDigits: 0,
            });
            const rmeStr = task.marginOfError.toFixed(2);

            lines.push(
              `    ${statusIcon} ${colorize('white', task.name)}: ${colorize('brightMagenta', mean)} ${colorize('dim', ansiChars.bullet)} ${colorize('brightBlue', `${ansiChars.plusMinus}${rmeStr}`)} ${colorize('dim', ansiChars.bullet)} ${colorize('magenta', opsStr)} ops/sec`,
            );

            if (task.iterations > 0) {
              lines.push(
                `      ${colorize('dim', `${task.iterations} iterations, cv: ${task.cv.toFixed(1)}%`)}`,
              );
            }
          }
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format as complete JSON
   */
  formatJson(data: ShowResult): string {
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Format nanoseconds as a human-readable time string
 */
const formatTime = (ns: number): string => {
  if (ns < 1000) {
    return `${ns.toFixed(2)}ns`;
  }
  if (ns < 1_000_000) {
    return `${(ns / 1000).toFixed(3)}µs`;
  }
  return `${(ns / 1_000_000).toFixed(3)}ms`;
};
