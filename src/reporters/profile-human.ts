/**
 * Profile Human Reporter
 *
 * Human-readable reporter for profile command. Uses modestbench's synthwave
 * ANSI theme to display profiled functions in an attractive, color-coded
 * format.
 *
 * @packageDocumentation
 */

import path from 'node:path';

import type { FilteredProfileData } from '../types/profiler.js';

import { ansiChars, colors } from '../utils/ansi.js';

/**
 * Reporter options
 */
interface ProfileReporterOptions {
  /** Enable color output */
  color?: boolean;

  /** Group by file */
  groupByFile?: boolean;
}

/**
 * Human-readable profile reporter
 */
export class ProfileHumanReporter {
  private readonly groupByFile: boolean;

  private readonly useColor: boolean;

  constructor(options: ProfileReporterOptions = {}) {
    this.useColor =
      options.color ??
      (process.stdout.isTTY &&
        process.env.FORCE_COLOR !== '0' &&
        process.env.NO_COLOR == null);

    this.groupByFile = options.groupByFile ?? false;
  }

  /**
   * Generate and print profile report
   */
  report(data: FilteredProfileData): void {
    this.printHeader(data);
    this.printLine();

    if (this.groupByFile && data.groupedByFile) {
      this.printGroupedResults(data);
    } else {
      this.printFlatResults(data);
    }
  }

  private colorize(color: keyof typeof colors, text: string): string {
    if (!this.useColor) {
      return text;
    }
    return `${colors[color]}${text}${colors.reset}`;
  }

  /**
   * Format file path - show relative path if within CWD, otherwise absolute
   */
  private formatPath(filePath: string): string {
    const cwd = process.cwd();
    const absolutePath = path.resolve(filePath);

    // Check if the file is within the current working directory
    if (absolutePath.startsWith(cwd + path.sep) || absolutePath === cwd) {
      return path.relative(cwd, absolutePath);
    }

    return absolutePath;
  }

  private getPercentColor(percent: number): keyof typeof colors {
    if (percent >= 10) {
      return 'brightRed';
    }
    if (percent >= 5) {
      return 'brightYellow';
    }
    if (percent >= 2) {
      return 'brightCyan';
    }
    return 'white';
  }

  private printFlatResults(data: FilteredProfileData): void {
    const header = `${this.colorize('magenta', ansiChars.block.full.repeat(2))} ${this.colorize('brightWhite', this.colorize('bold', 'Benchmark Candidates'))}`;
    this.printLine(header);
    this.printLine();
    this.printLine('Top functions by execution time:');
    this.printLine();

    for (const fn of data.functions) {
      // Function name and percentage
      const percentColor = this.getPercentColor(fn.percentage);
      const percent = `${fn.percentage.toFixed(1)}%`;
      const ticks = `(${fn.ticks.toLocaleString()} ticks)`;

      this.printLine(
        `  ${this.colorize('brightWhite', fn.name).padEnd(60)} ${this.colorize(percentColor, percent.padStart(6))}  ${this.colorize('dim', ticks)}`,
      );

      // File and line
      const displayPath = this.formatPath(fn.file);
      const lineInfo = fn.line ? `:${fn.line}` : '';
      this.printLine(
        `  ${this.colorize('brightMagenta', this.colorize('bold', displayPath + lineInfo))}`,
      );
      this.printLine();
    }

    this.printSummary(data);
  }

  private printGroupedResults(data: FilteredProfileData): void {
    if (!data.groupedByFile) {
      return;
    }

    const header = `${this.colorize('magenta', ansiChars.block.full.repeat(2))} ${this.colorize('brightWhite', this.colorize('bold', 'Grouped by File'))}`;
    this.printLine(header);
    this.printLine();

    // Sort files by total percentage
    const sortedFiles = Array.from(data.groupedByFile.entries()).sort(
      (a, b) => {
        const aTotal = a[1].reduce((sum, fn) => sum + fn.percentage, 0);
        const bTotal = b[1].reduce((sum, fn) => sum + fn.percentage, 0);
        return bTotal - aTotal;
      },
    );

    for (const [file, functions] of sortedFiles) {
      const totalPercent = functions.reduce(
        (sum, fn) => sum + fn.percentage,
        0,
      );
      const totalTicks = functions.reduce((sum, fn) => sum + fn.ticks, 0);

      const percentColor = this.getPercentColor(totalPercent);
      const percent = `${totalPercent.toFixed(1)}%`;
      const ticks = `(${totalTicks.toLocaleString()} ticks)`;

      // File header
      const displayPath = this.formatPath(file);
      this.printLine(
        `${this.colorize('magenta', ansiChars.block.dark)} ${this.colorize('brightMagenta', this.colorize('bold', displayPath)).padEnd(60)} ${this.colorize(percentColor, percent.padStart(6))}  ${this.colorize('dim', ticks)}`,
      );

      // Functions in this file
      for (const fn of functions) {
        const fnPercent = `${fn.percentage.toFixed(1)}%`;
        const fnTicks = `(${fn.ticks.toLocaleString()} ticks)`;
        const lineInfo = fn.line ? `:${fn.line}` : '';

        this.printLine(
          `  ${this.colorize('magenta', ansiChars.smallSquare)} ${this.colorize('brightWhite', fn.name).padEnd(58)} ${this.colorize(this.getPercentColor(fn.percentage), fnPercent.padStart(6))}  ${this.colorize('dim', fnTicks.padEnd(15))} ${this.colorize('dim', lineInfo)}`,
        );
      }

      this.printLine();
    }

    this.printSummary(data);
  }

  private printHeader(data: FilteredProfileData): void {
    const header = `${this.colorize('magenta', ansiChars.block.full.repeat(2))} ${this.colorize('brightWhite', this.colorize('bold', 'Profile Analysis'))}`;
    this.printLine(header);
    this.printLine();

    if (data.command) {
      this.printLine(`Command: ${this.colorize('cyan', data.command)}`);
    }

    if (data.duration) {
      const durationSec = (data.duration / 1000).toFixed(1);
      this.printLine(`Duration: ${this.colorize('cyan', `${durationSec}s`)}`);
    }

    this.printLine(
      `Total Ticks: ${this.colorize('cyan', data.totalTicks.toLocaleString())}`,
    );
  }

  private printLine(text = ''): void {
    console.log(text);
  }

  private printSummary(data: FilteredProfileData): void {
    if (data.totalShown === 0) {
      this.printLine(
        `${this.colorize('dim', `No functions used at least ${data.minExecutionPercent}% of the ticks`)}`,
      );
    } else {
      this.printLine(
        `${this.colorize('dim', `... (showing top ${data.totalShown} of ${data.totalFiltered} user functions)`)}`,
      );
    }
  }
}
