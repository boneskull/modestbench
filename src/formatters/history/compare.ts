/**
 * Compare Formatter
 *
 * Formats benchmark run comparison results in human and JSON formats.
 */

import type { CompareResult } from '../../services/history/models.js';
import type { HistoryFormatter } from './base.js';

import { colorize } from '../../utils/ansi.js';
import { ansiChars } from '../../utils/ansi.js';

/**
 * Formatter for history compare command
 */
export class HistoryCompareFormatter
  implements HistoryFormatter<CompareResult>
{
  /**
   * Format as human-readable comparison
   */
  formatHuman(data: CompareResult): string {
    const lines: string[] = [];

    lines.push(colorize('brightMagenta', colorize('bold', 'Comparing runs:')));
    lines.push(
      `  ${colorize('brightCyan', ansiChars.bullet)} ${colorize('brightWhite', colorize('bold', 'Run 1'))} ${colorize('dim', data.run1.id)} (${colorize('white', data.run1.startTime.toLocaleString())})`,
    );
    lines.push(
      `  ${colorize('brightCyan', ansiChars.bullet)} ${colorize('brightWhite', colorize('bold', 'Run 2'))} ${colorize('dim', data.run2.id)} (${colorize('white', data.run2.startTime.toLocaleString())})`,
    );
    lines.push('');

    lines.push(colorize('cyan', 'Summary comparison:'));
    lines.push('');
    lines.push(
      `  ${colorize('dim', ansiChars.smallSquare)} Files: ${colorize('brightWhite', String(data.run1.summary.totalFiles))} vs ${colorize('brightWhite', String(data.run2.summary.totalFiles))}`,
    );
    lines.push(
      `  ${colorize('dim', ansiChars.smallSquare)} Tasks: ${colorize('brightWhite', String(data.run1.summary.totalTasks))} vs ${colorize('brightWhite', String(data.run2.summary.totalTasks))}`,
    );
    lines.push(
      `  ${colorize('dim', ansiChars.smallSquare)} Passed: ${colorize('brightCyan', String(data.run1.summary.passedTasks))} vs ${colorize('brightCyan', String(data.run2.summary.passedTasks))}`,
    );
    lines.push(
      `  ${colorize('dim', ansiChars.smallSquare)} Failed: ${colorize('brightRed', colorize('bold', String(data.run1.summary.failedTasks)))} vs ${colorize('brightRed', colorize('bold', String(data.run2.summary.failedTasks)))}`,
    );
    lines.push('');

    // Detailed task comparison
    if (data.tasksInBoth.length > 0) {
      lines.push(colorize('cyan', 'Task-by-task comparison:'));
      lines.push('');

      for (const comparison of data.tasksInBoth) {
        const mean1 = comparison.run1!.mean / 1000000; // Convert to ms
        const mean2 = comparison.run2!.mean / 1000000;
        const changeSign = comparison.percentChange >= 0 ? '+' : '';
        const changeStr = `${changeSign}${comparison.percentChange.toFixed(1)}%`;

        lines.push(
          `  ${colorize('brightWhite', `${comparison.suite} › ${comparison.task}`)}`,
        );

        // Mean - highlight higher (slower/worse) number
        const meanHigher = mean2 > mean1;
        const mean1Str = meanHigher
          ? colorize('magenta', `${mean1.toFixed(3)}ms`)
          : colorize('brightMagenta', `${mean1.toFixed(3)}ms`);
        const mean2Str = meanHigher
          ? colorize('brightMagenta', `${mean2.toFixed(3)}ms`)
          : colorize('magenta', `${mean2.toFixed(3)}ms`);
        lines.push(
          `    ${colorize('dim', ansiChars.bullet)} ${colorize('white', 'Mean:')} ${mean1Str} ${colorize('dim', '→')} ${mean2Str} ${colorize('dim', `(${colorize('white', changeStr)}`)}`,
        );

        // Min - highlight higher number
        const min1 = comparison.run1!.min / 1000000;
        const min2 = comparison.run2!.min / 1000000;
        const minHigher = min2 > min1;
        const min1Str = minHigher
          ? colorize('magenta', `${min1.toFixed(3)}ms`)
          : colorize('brightMagenta', `${min1.toFixed(3)}ms`);
        const min2Str = minHigher
          ? colorize('brightMagenta', `${min2.toFixed(3)}ms`)
          : colorize('magenta', `${min2.toFixed(3)}ms`);
        lines.push(
          `    ${colorize('dim', ansiChars.bullet)} ${colorize('white', 'Min:')}  ${min1Str} ${colorize('dim', '→')} ${min2Str}`,
        );

        // Max - highlight higher number
        const max1 = comparison.run1!.max / 1000000;
        const max2 = comparison.run2!.max / 1000000;
        const maxHigher = max2 > max1;
        const max1Str = maxHigher
          ? colorize('magenta', `${max1.toFixed(3)}ms`)
          : colorize('brightMagenta', `${max1.toFixed(3)}ms`);
        const max2Str = maxHigher
          ? colorize('brightMagenta', `${max2.toFixed(3)}ms`)
          : colorize('magenta', `${max2.toFixed(3)}ms`);
        lines.push(
          `    ${colorize('dim', ansiChars.bullet)} ${colorize('white', 'Max:')}  ${max1Str} ${colorize('dim', '→')} ${max2Str}`,
        );

        // Iterations - highlight higher number
        const iter1 = comparison.run1!.iterations;
        const iter2 = comparison.run2!.iterations;
        const iterHigher = iter2 > iter1;
        const iter1Str = iterHigher
          ? colorize('brightWhite', String(iter1))
          : colorize('bold', colorize('brightWhite', String(iter1)));
        const iter2Str = iterHigher
          ? colorize('bold', colorize('brightWhite', String(iter2)))
          : colorize('brightWhite', String(iter2));
        lines.push(
          `    ${colorize('dim', ansiChars.bullet)} ${colorize('white', 'Iterations:')} ${iter1Str} ${colorize('dim', 'vs')} ${iter2Str}`,
        );

        // CV (Coefficient of Variation) - shows measurement consistency
        const cv1 = comparison.run1!.cv * 100;
        const cv2 = comparison.run2!.cv * 100;
        const cvHigher = cv2 > cv1;
        const cv1Str = cvHigher
          ? colorize('magenta', `${cv1.toFixed(2)}%`)
          : colorize('brightMagenta', `${cv1.toFixed(2)}%`);
        const cv2Str = cvHigher
          ? colorize('brightMagenta', `${cv2.toFixed(2)}%`)
          : colorize('magenta', `${cv2.toFixed(2)}%`);
        lines.push(
          `    ${colorize('dim', ansiChars.bullet)} ${colorize('white', 'CV:')}  ${cv1Str} ${colorize('dim', '→')} ${cv2Str}`,
        );

        lines.push('');
      }
    }

    if (data.tasksOnlyInRun1.length > 0) {
      lines.push(
        colorize(
          'cyan',
          `Tasks only in run 1 (${data.tasksOnlyInRun1.length}):`,
        ),
      );
      for (const task of data.tasksOnlyInRun1) {
        lines.push(
          `  ${colorize('dim', ansiChars.bullet)} ${colorize('brightWhite', `${task.suite} › ${task.task}`)}`,
        );
      }
      lines.push('');
    }

    if (data.tasksOnlyInRun2.length > 0) {
      lines.push(
        colorize(
          'cyan',
          `Tasks only in run 2 (${data.tasksOnlyInRun2.length}):`,
        ),
      );
      for (const task of data.tasksOnlyInRun2) {
        lines.push(
          `  ${colorize('dim', ansiChars.bullet)} ${colorize('brightWhite', `${task.suite} › ${task.task}`)}`,
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format as JSON
   */
  formatJson(data: CompareResult): string {
    return JSON.stringify(
      {
        run1: data.run1,
        run2: data.run2,
        taskComparisons: data.tasksInBoth,
        tasksOnlyInRun1: data.tasksOnlyInRun1,
        tasksOnlyInRun2: data.tasksOnlyInRun2,
      },
      null,
      2,
    );
  }
}
