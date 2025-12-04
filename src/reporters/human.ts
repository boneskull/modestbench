/**
 * ModestBench Human-Readable Console Reporter
 *
 * Provides colorized, progressive output for terminal environments. Displays
 * real-time progress, results, and formatted statistics.
 */

import path from 'node:path';

import type {
  BenchmarkRun,
  BudgetSummary,
  FileResult,
  ProgressState,
  SuiteResult,
  TaskResult,
} from '../types/index.js';

import { BaseReporter } from '../services/reporter-registry.js';
import { ansiChars, colors } from '../utils/ansi.js';

/**
 * Minimum iterations required for reliable CV calculation
 */
const MIN_RELIABLE_ITERATIONS = 30;

/**
 * Human-readable console reporter with colorized output
 */
export class HumanReporter extends BaseReporter {
  private currentFile = '';

  private currentSuite = '';

  private currentSuiteMaxNameLen = 0; // Track max name length for current suite alignment

  private failures: Array<{
    error: string;
    file: string;
    suite: string;
    task: string;
  }> = [];

  private lastProgressLine = '';

  private lowIterationCount = 0;

  private maxTimePadWidth = 0; // Track maximum time padding width to prevent jitter

  private progressWindowActive = false; // Track if progress window is rendered

  private readonly quiet: boolean;

  private readonly showProgress: boolean;

  private startTime = 0;

  private suiteResults: TaskResult[] = [];

  private readonly useColor: boolean;

  private readonly verbose: boolean;

  constructor(
    options: {
      color?: boolean;
      progress?: boolean;
      quiet?: boolean;
      verbose?: boolean;
    } = {},
  ) {
    super('human', options);

    // Auto-detect color support if not explicitly set
    this.useColor =
      options.color ??
      (process.stdout.isTTY &&
        process.env.FORCE_COLOR !== '0' &&
        process.env.NO_COLOR == null);

    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;
    this.showProgress = options.progress ?? true;
  }

  /**
   * Format bytes in human-readable format
   */
  private static formatBytes(this: void, bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format file path - show relative path if within CWD, otherwise absolute
   */
  private static formatPath(this: void, filePath: string): string {
    const cwd = process.cwd();
    const absolutePath = path.resolve(filePath);

    // Check if the file is within the current working directory
    if (absolutePath.startsWith(cwd + path.sep) || absolutePath === cwd) {
      return path.relative(cwd, absolutePath);
    }

    return absolutePath;
  }

  /**
   * Simple pluralization helper
   */
  private static pluralize(this: void, str: string, count: number): string {
    return count === 1 ? str : `${str}s`;
  }

  onBudgetResult(summary: BudgetSummary): void {
    if (summary.total === 0 || this.quiet) {
      return;
    }

    this.clearProgress();

    this.printLine();
    const budgetHeader = `${this.colorize('magenta', ansiChars.block.full.repeat(2))} ${this.colorize('brightWhite', this.colorize('bold', 'Performance Budgets'))}`;
    this.printLine(budgetHeader);
    this.printLine();

    for (const result of summary.results) {
      const icon = result.passed ? ansiChars.checkmark : ansiChars.cross;
      const iconColor = result.passed ? 'brightCyan' : 'brightRed';

      this.printLine(
        `  ${this.colorize(iconColor, icon)} ${this.colorize('white', result.taskId)}`,
      );

      if (!result.passed && result.violations.length > 0) {
        for (const violation of result.violations) {
          this.printLine(
            `      ${this.colorize('brightRed', violation.message)}`,
          );
        }
      }
    }

    this.printLine();

    const statusText =
      summary.failed === 0
        ? `${this.colorize('brightCyan', ansiChars.checkmark)} All ${summary.total} budget(s) passed`
        : `${this.colorize('brightRed', ansiChars.cross)} ${summary.failed} of ${summary.total} budget(s) failed`;

    this.printLine(`  ${statusText}`);
    this.printLine();
  }

  onEnd(run: BenchmarkRun): void {
    if (this.quiet) {
      return;
    }

    this.clearProgress();

    const duration = Date.now() - this.startTime;
    const totalFiles = run.files.length;

    // Calculate totals across all files
    let totalSuites = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalAborted = 0;

    for (const file of run.files) {
      totalSuites += file.suites.length;
      for (const suite of file.suites) {
        totalPassed += suite.tasks.filter(
          (t: TaskResult) => !t.error && !t.aborted,
        ).length;
        totalFailed += suite.tasks.filter((t: TaskResult) => t.error).length;
        totalAborted += suite.tasks.filter((t: TaskResult) => t.aborted).length;
      }
    }

    // Results header
    const resultsHeader = `${this.colorize('magenta', ansiChars.block.full.repeat(2))} ${this.colorize('brightWhite', this.colorize('bold', 'Results'))}`;
    this.printLine(resultsHeader);
    this.printLine();

    this.printLine(
      `${this.colorize('brightBlue', '  Files:')} ${this.colorize('brightWhite', String(totalFiles))}`,
    );
    this.printLine(
      `${this.colorize('brightBlue', '  Suites:')} ${this.colorize('brightWhite', String(totalSuites))}`,
    );
    this.printLine(
      `${this.colorize('brightBlue', '  Tasks:')} ${this.colorize('brightWhite', String(totalPassed + totalFailed + totalAborted))}`,
    );
    if (totalFailed > 0 || totalAborted > 0) {
      if (totalFailed > 0) {
        this.printLine(
          `${this.colorize('brightRed', ansiChars.cross + ' Failed:')} ${this.colorize('brightWhite', String(totalFailed))}`,
        );
      }
      if (totalPassed > 0) {
        this.printLine(
          `${this.colorize('brightCyan', ansiChars.checkmark + ' Passed:')} ${this.colorize('brightWhite', String(totalPassed))}`,
        );
      }
      if (totalAborted > 0) {
        this.printLine(
          `${this.colorize('brightYellow', ansiChars.approx + ' Aborted:')} ${this.colorize('brightWhite', String(totalAborted))}`,
        );
      }
    } else {
      this.printLine(
        `${this.colorize('brightCyan', ansiChars.checkmark + ' All tasks passed:')} ${this.colorize('brightWhite', String(totalPassed))}`,
      );
    }
    this.printLine(
      `${this.colorize('cyan', ansiChars.approx + ' Duration:')} ${this.colorize('brightWhite', BaseReporter.formatDuration(duration * 1000000))}`,
    );
    this.printLine();

    if (totalFailed > 0) {
      // Display failed tasks with details
      if (this.failures.length > 0) {
        this.printLine();
        this.printLine(
          this.colorize('brightRed', this.colorize('bold', 'Failed Tasks:')),
        );
        this.printLine();

        for (const failure of this.failures) {
          const displayPath = HumanReporter.formatPath(failure.file);
          this.printLine(
            `  ${this.colorize('dim', displayPath)} ${this.colorize('dim', '›')} ${this.colorize('white', failure.suite)} ${this.colorize('dim', '›')} ${this.colorize('brightWhite', failure.task)}`,
          );
          this.printLine(`    ${this.colorize('brightRed', failure.error)}`);
          this.printLine();
        }
      }
    } else if (totalAborted === 0) {
      // Only show "Rad" if no failures AND no aborts
      const successMessage = `${this.colorize('brightMagenta', 'Rad. ☮')}`;
      this.printLine(successMessage);
    }

    // Show warning for low iteration counts
    if (this.lowIterationCount > 0) {
      this.printLine();
      this.printLine(
        `${this.colorize('brightYellow', ansiChars.approx)} ${this.colorize('brightYellow', 'Warning:')} ${this.lowIterationCount} ${HumanReporter.pluralize('task', this.lowIterationCount)} had low iteration counts (<${MIN_RELIABLE_ITERATIONS}) which may affect statistical reliability`,
      );
    }
  }

  onError(error: Error): void {
    if (this.quiet) {
      return;
    }

    this.clearProgress();
    console.error(
      this.colorize('red', ansiChars.cross.repeat(3) + ' Error:'),
      error.message,
    );

    if (this.verbose && error.stack) {
      console.error(this.colorize('dim', error.stack));
    }
  }

  onFileEnd(result: FileResult): void {
    if (this.quiet) {
      return;
    }

    const totalTasks = result.suites.reduce(
      (sum, suite) => sum + suite.tasks.length,
      0,
    );
    const totalPassed = result.suites.reduce(
      (sum, suite) => sum + suite.tasks.filter((t) => !t.error).length,
      0,
    );
    const totalFailed = totalTasks - totalPassed;

    if (totalFailed > 0) {
      this.printLine(
        this.colorize(
          'red',
          `  ${ansiChars.cross} ${totalFailed} failed, ${totalPassed} passed`,
        ),
      );
    } else {
      this.printLine(
        ` ${this.colorize('magenta', ansiChars.checkmark)} ${totalPassed > 1 ? this.colorize('brightMagenta', 'All ') : ''}${this.colorize('bold', this.colorize('brightMagenta', `${totalPassed}`))} ${this.colorize('brightMagenta', `${HumanReporter.pluralize('task', totalPassed)} passed`)}`,
      );
    }

    this.printLine();
  }

  onFileStart(file: string): void {
    this.currentFile = file;

    if (this.quiet) {
      return;
    }

    const displayPath = HumanReporter.formatPath(file);
    const fileMarker = `${colors.magenta}${ansiChars.block.dark}${ansiChars.block.dark}${colors.reset}`;
    this.printLine(
      `${fileMarker} ${colors.underline}${this.colorize('brightMagenta', this.colorize('bold', displayPath))}${colors.reset}`,
    );
  }

  onProgress(state: ProgressState): void {
    // Only show progress bar in non-verbose, non-quiet mode with progress enabled
    if (this.quiet || this.verbose || !this.showProgress) {
      return;
    }

    // Only show in TTY mode (progress bar updates in place)
    if (!process.stdout.isTTY) {
      return;
    }

    const { currentTask, elapsed, percentage, tasksCompleted, totalTasks } =
      state;

    // Pad task counts for alignment
    const totalTasksWidth = String(totalTasks).length;
    const paddedTasksCompleted = String(tasksCompleted).padStart(
      totalTasksWidth,
      ' ',
    );

    // Format elapsed time
    const elapsedSeconds = Math.round(elapsed / 1000);
    const elapsedStrRaw = this.formatTimeRemaining(elapsedSeconds);

    // Calculate ETA if we have completed tasks and determine padding width
    let etaStr = '';
    let padWidth = Math.max(this.maxTimePadWidth, elapsedStrRaw.length);
    if (tasksCompleted > 0) {
      const avgTimePerTask = elapsed / tasksCompleted;
      const remainingTasks = totalTasks - tasksCompleted;
      const etaMs = avgTimePerTask * remainingTasks;
      const etaSeconds = Math.round(etaMs / 1000);
      const etaTimeStr = this.formatTimeRemaining(etaSeconds);
      padWidth = Math.max(padWidth, etaTimeStr.length);
      etaStr = ` ${this.colorize('gray', '|')} ${this.colorize('gray', 'ETA:')} ${this.colorize('brightBlue', etaTimeStr)}`;
    }

    // Remember the maximum width we've ever used to prevent jitter
    this.maxTimePadWidth = Math.max(this.maxTimePadWidth, padWidth);

    // Pad elapsed time to match the longest time string
    const elapsedStr = elapsedStrRaw.padStart(this.maxTimePadWidth, ' ');

    const roundedPercentage = percentage.toFixed(2);

    // Build progress line with current task if available
    let line = `${this.colorize('brightCyan', ansiChars.approx)} ${this.colorize('white', paddedTasksCompleted)}${this.colorize('gray', '/')}${this.colorize('white', String(totalTasks))} ${this.colorize('gray', 'tasks')} ${this.colorize('gray', '(')}${this.colorize('brightBlue', roundedPercentage + '%')}${this.colorize('gray', ')')} ${this.colorize('gray', '|')} ${this.colorize('gray', 'Elapsed:')} ${this.colorize('cyan', elapsedStr)}${etaStr}`;

    if (currentTask) {
      const truncatedTask =
        currentTask.length > 60
          ? currentTask.substring(0, 57) + '...'
          : currentTask;
      line += ` ${this.colorize('gray', '|')} ${this.colorize('white', truncatedTask)}`;
    }

    this.lastProgressLine = line;
    this.renderProgressWindow();
  }

  onStart(run: BenchmarkRun): void {
    this.startTime = Date.now();
    this.failures = []; // Reset failures for new run
    this.lastProgressLine = ''; // Reset for new run
    this.maxTimePadWidth = 0; // Reset time padding width for new run
    this.lowIterationCount = 0; // Reset low iteration count for new run

    if (this.quiet) {
      return;
    }

    let header: string;
    if (run.environment) {
      header = `
    \x1b[49m       \x1b[38;5;0;49m▄▄\x1b[38;5;37;48;5;0m▄\x1b[38;5;14;48;5;0m▄\x1b[38;5;6;48;5;0m▄\x1b[38;5;0;49m▄▄\x1b[49m       \x1b[m
    \x1b[49m    \x1b[38;5;0;49m▄\x1b[38;5;235;48;5;0m▄\x1b[38;5;45;48;5;0m▄\x1b[38;5;14;48;5;23m▄\x1b[48;5;14m    \x1b[38;5;14;48;5;14m▄\x1b[38;5;14;48;5;236m▄\x1b[38;5;44;48;5;0m▄\x1b[38;5;233;48;5;0m▄\x1b[38;5;0;49m▄\x1b[49m    \x1b[m
    \x1b[38;5;0;49m▄▄\x1b[38;5;30;48;5;0m▄\x1b[38;5;14;48;5;233m▄\x1b[38;5;14;48;5;37m▄\x1b[48;5;14m           \x1b[38;5;14;48;5;37m▄\x1b[38;5;14;48;5;0m▄\x1b[38;5;23;48;5;0m▄\x1b[38;5;0;49m▄▄\x1b[m
    \x1b[48;5;0m \x1b[38;5;14;48;5;45m▄\x1b[48;5;14m     \x1b[38;5;44;48;5;14m▄\x1b[38;5;24;48;5;14m▄\x1b[38;5;242;48;5;14m▄\x1b[38;5;5;48;5;14m▄\x1b[38;5;60;48;5;14m▄\x1b[38;5;24;48;5;14m▄\x1b[38;5;44;48;5;14m▄\x1b[48;5;14m     \x1b[38;5;14;48;5;44m▄\x1b[48;5;0m \x1b[m
    \x1b[48;5;0m \x1b[48;5;14m   \x1b[38;5;44;48;5;14m▄\x1b[38;5;53;48;5;45m▄\x1b[38;5;44;48;5;53m▄\x1b[38;5;14;48;5;162m▄\x1b[38;5;14;48;5;89m▄▄\x1b[38;5;14;48;5;162m▄\x1b[38;5;44;48;5;198m▄\x1b[38;5;235;48;5;198m▄\x1b[48;5;198m \x1b[38;5;30;48;5;237m▄\x1b[38;5;38;48;5;14m▄\x1b[48;5;14m    \x1b[48;5;0m \x1b[m \x1b[97m\x1b[4;1mmodest\x1b[0m\x1b[4;97mbench\x1b[0m \x1b[4;97m  \x1b[0m \x1b[4;97m \x1b[0m
    \x1b[48;5;0m \x1b[48;5;14m  \x1b[38;5;237;48;5;45m▄\x1b[38;5;14;48;5;23m▄\x1b[48;5;14m       \x1b[38;5;14;48;5;14m▄\x1b[38;5;53;48;5;38m▄\x1b[38;5;44;48;5;23m▄\x1b[38;5;198;48;5;238m▄\x1b[38;5;198;48;5;125m▄\x1b[38;5;23;48;5;14m▄\x1b[48;5;14m  \x1b[48;5;0m \x1b[m
    \x1b[48;5;0m \x1b[48;5;14m \x1b[38;5;30;48;5;38m▄\x1b[38;5;14;48;5;14m▄\x1b[48;5;14m      \x1b[38;5;45;48;5;14m▄\x1b[38;5;89;48;5;14m▄\x1b[38;5;89;48;5;89m▄\x1b[38;5;14;48;5;31m▄\x1b[48;5;14m \x1b[38;5;37;48;5;89m▄\x1b[48;5;198m \x1b[38;5;198;48;5;198m▄\x1b[38;5;31;48;5;14m▄\x1b[48;5;14m \x1b[48;5;0m \x1b[m \x1b[2mnode.js:\x1b[m \x1b[36m${run.environment.nodeVersion} \x1b[m
    \x1b[48;5;0m \x1b[48;5;14m \x1b[38;5;44;48;5;31m▄\x1b[48;5;14m      \x1b[38;5;126;48;5;38m▄\x1b[38;5;198;48;5;237m▄\x1b[38;5;237;48;5;37m▄\x1b[48;5;14m   \x1b[38;5;14;48;5;14m▄\x1b[38;5;162;48;5;198m▄▄\x1b[38;5;53;48;5;240m▄\x1b[48;5;14m \x1b[48;5;0m \x1b[m \x1b[2mplatform:\x1b[m \x1b[36m${run.environment.platform} ${run.environment.arch} \x1b[m
    \x1b[48;5;0m \x1b[38;5;45;48;5;14m▄\x1b[48;5;14m       \x1b[38;5;14;48;5;37m▄\x1b[38;5;14;48;5;5m▄\x1b[38;5;14;48;5;44m▄\x1b[48;5;14m       \x1b[38;5;45;48;5;14m▄\x1b[48;5;0m \x1b[m \x1b[2mcpu:\x1b[m \x1b[36m${run.environment.cpu.model} \x1b[2m(\x1b[m\x1b[36m${run.environment.cpu.cores} cores\x1b[2m) \x1b[m
    \x1b[49;38;5;0m▀▀\x1b[38;5;0;48;5;6m▄\x1b[38;5;232;48;5;14m▄\x1b[38;5;38;48;5;14m▄\x1b[48;5;14m           \x1b[38;5;30;48;5;14m▄\x1b[38;5;0;48;5;14m▄\x1b[38;5;0;48;5;23m▄\x1b[49;38;5;0m▀▀\x1b[m \x1b[2mmem:\x1b[m \x1b[36m${HumanReporter.formatBytes(run.environment.memory.total)} \x1b[m
    \x1b[49m    \x1b[49;38;5;0m▀\x1b[38;5;0;48;5;236m▄\x1b[38;5;0;48;5;45m▄\x1b[38;5;23;48;5;14m▄\x1b[48;5;14m     \x1b[38;5;236;48;5;14m▄\x1b[38;5;0;48;5;44m▄\x1b[38;5;0;48;5;232m▄\x1b[49;38;5;0m▀\x1b[49m    \x1b[m
    \x1b[49m       \x1b[49;38;5;0m▀▀\x1b[38;5;0;48;5;37m▄\x1b[38;5;0;48;5;14m▄\x1b[38;5;0;48;5;30m▄\x1b[49;38;5;0m▀▀\x1b[49m       \x1b[m
    `;
    } else {
      header = `
    \x1b[49m       \x1b[38;5;0;49m▄▄\x1b[38;5;37;48;5;0m▄\x1b[38;5;14;48;5;0m▄\x1b[38;5;6;48;5;0m▄\x1b[38;5;0;49m▄▄\x1b[49m       \x1b[m
    \x1b[49m    \x1b[38;5;0;49m▄\x1b[38;5;235;48;5;0m▄\x1b[38;5;45;48;5;0m▄\x1b[38;5;14;48;5;23m▄\x1b[48;5;14m    \x1b[38;5;14;48;5;14m▄\x1b[38;5;14;48;5;236m▄\x1b[38;5;44;48;5;0m▄\x1b[38;5;233;48;5;0m▄\x1b[38;5;0;49m▄\x1b[49m    \x1b[m
    \x1b[38;5;0;49m▄▄\x1b[38;5;30;48;5;0m▄\x1b[38;5;14;48;5;233m▄\x1b[38;5;14;48;5;37m▄\x1b[48;5;14m           \x1b[38;5;14;48;5;37m▄\x1b[38;5;14;48;5;0m▄\x1b[38;5;23;48;5;0m▄\x1b[38;5;0;49m▄▄\x1b[m
    \x1b[48;5;0m \x1b[38;5;14;48;5;45m▄\x1b[48;5;14m     \x1b[38;5;44;48;5;14m▄\x1b[38;5;24;48;5;14m▄\x1b[38;5;242;48;5;14m▄\x1b[38;5;5;48;5;14m▄\x1b[38;5;60;48;5;14m▄\x1b[38;5;24;48;5;14m▄\x1b[38;5;44;48;5;14m▄\x1b[48;5;14m     \x1b[38;5;14;48;5;44m▄\x1b[48;5;0m \x1b[m
    \x1b[48;5;0m \x1b[48;5;14m   \x1b[38;5;44;48;5;14m▄\x1b[38;5;53;48;5;45m▄\x1b[38;5;44;48;5;53m▄\x1b[38;5;14;48;5;162m▄\x1b[38;5;14;48;5;89m▄▄\x1b[38;5;14;48;5;162m▄\x1b[38;5;44;48;5;198m▄\x1b[38;5;235;48;5;198m▄\x1b[48;5;198m \x1b[38;5;30;48;5;237m▄\x1b[38;5;38;48;5;14m▄\x1b[48;5;14m    \x1b[48;5;0m \x1b[m \x1b[97m\x1b[4;1mmodest\x1b[0m\x1b[4;97mbench\x1b[0m \x1b[4;97m \x1b[0m
    \x1b[48;5;0m \x1b[48;5;14m  \x1b[38;5;237;48;5;45m▄\x1b[38;5;14;48;5;23m▄\x1b[48;5;14m       \x1b[38;5;14;48;5;14m▄\x1b[38;5;53;48;5;38m▄\x1b[38;5;44;48;5;23m▄\x1b[38;5;198;48;5;238m▄\x1b[38;5;198;48;5;125m▄\x1b[38;5;23;48;5;14m▄\x1b[48;5;14m  \x1b[48;5;0m \x1b[m
    \x1b[48;5;0m \x1b[48;5;14m \x1b[38;5;30;48;5;38m▄\x1b[38;5;14;48;5;14m▄\x1b[48;5;14m      \x1b[38;5;45;48;5;14m▄\x1b[38;5;89;48;5;14m▄\x1b[38;5;89;48;5;89m▄\x1b[38;5;14;48;5;31m▄\x1b[48;5;14m \x1b[38;5;37;48;5;89m▄\x1b[48;5;198m \x1b[38;5;198;48;5;198m▄\x1b[38;5;31;48;5;14m▄\x1b[48;5;14m \x1b[48;5;0m \x1b[m
    \x1b[48;5;0m \x1b[48;5;14m \x1b[38;5;44;48;5;31m▄\x1b[48;5;14m      \x1b[38;5;126;48;5;38m▄\x1b[38;5;198;48;5;237m▄\x1b[38;5;237;48;5;37m▄\x1b[48;5;14m   \x1b[38;5;14;48;5;14m▄\x1b[38;5;162;48;5;198m▄▄\x1b[38;5;53;48;5;240m▄\x1b[48;5;14m \x1b[48;5;0m \x1b[m
    \x1b[48;5;0m \x1b[38;5;45;48;5;14m▄\x1b[48;5;14m       \x1b[38;5;14;48;5;37m▄\x1b[38;5;14;48;5;5m▄\x1b[38;5;14;48;5;44m▄\x1b[48;5;14m       \x1b[38;5;45;48;5;14m▄\x1b[48;5;0m \x1b[m
    \x1b[49;38;5;0m▀▀\x1b[38;5;0;48;5;6m▄\x1b[38;5;232;48;5;14m▄\x1b[38;5;38;48;5;14m▄\x1b[48;5;14m           \x1b[38;5;30;48;5;14m▄\x1b[38;5;0;48;5;14m▄\x1b[38;5;0;48;5;23m▄\x1b[49;38;5;0m▀▀\x1b[m
    \x1b[49m    \x1b[49;38;5;0m▀\x1b[38;5;0;48;5;236m▄\x1b[38;5;0;48;5;45m▄\x1b[38;5;23;48;5;14m▄\x1b[48;5;14m     \x1b[38;5;236;48;5;14m▄\x1b[38;5;0;48;5;44m▄\x1b[38;5;0;48;5;232m▄\x1b[49;38;5;0m▀\x1b[49m    \x1b[m
    \x1b[49m       \x1b[49;38;5;0m▀▀\x1b[38;5;0;48;5;37m▄\x1b[38;5;0;48;5;14m▄\x1b[38;5;0;48;5;30m▄\x1b[49;38;5;0m▀▀\x1b[49m       \x1b[m
    `;
    }
    this.printLine(header);
    this.printLine();

    if (run.git) {
      this.printLine(`  Git: ${this.colorize('cyan', run.git.commit)}`);
    }

    if (run.ci) {
      this.printLine(`  CI: ${this.colorize('cyan', run.ci.provider)}`);
      this.printLine();
    }
  }

  onSuiteEnd(result: SuiteResult): void {
    if (this.quiet) {
      return;
    }

    // Tasks are printed immediately in onTaskResult, so just print suite summary

    // Skip displaying summary for the implicit "default" suite
    if (result.name === 'default') {
      return;
    }

    const passed = result.tasks.filter((t) => !t.error && !t.aborted).length;
    const failed = result.tasks.filter((t) => t.error).length;
    const aborted = result.tasks.filter((t) => t.aborted).length;
    const durationStr = BaseReporter.formatDuration(result.duration * 1000000); // ms to ns

    // Build summary parts
    const parts: string[] = [];

    if (failed > 0) {
      parts.push(this.colorize('red', `${ansiChars.cross} ${failed} failed`));
    }
    if (passed > 0) {
      parts.push(this.colorize('green', `${passed} passed`));
    }
    if (aborted > 0) {
      parts.push(this.colorize('brightYellow', `${aborted} aborted`));
    }

    const summary = parts.join(', ');
    const timeInfo = `${this.colorize('gray', 'in')} ${this.colorize('cyan', durationStr)}`;

    if (failed > 0 || aborted > 0) {
      this.printLine(`  ${summary} ${timeInfo}`);
    } else {
      this.printLine(
        `  ${this.colorize('magenta', ansiChars.checkmark)} ${this.colorize('bold', this.colorize('brightWhite', `${passed}`))} ${this.colorize('brightWhite', `${HumanReporter.pluralize('task', passed)} passed`)} ${timeInfo}`,
      );
    }
    this.printLine();
  }

  onSuiteInit(suite: string, taskNames: readonly string[]): void {
    // Pre-calculate max name length for optimal alignment
    const terminalWidth = process.stdout.columns || 80;
    const STATS_RESERVED_WIDTH = 70;
    const MAX_NAME_WIDTH = Math.max(
      40,
      Math.min(
        60,
        terminalWidth - 4 - 2 - 2 - STATS_RESERVED_WIDTH, // BASE_INDENT(4) + status(1) + space(1) + ": "(2)
      ),
    );

    // Calculate the actual max name length from non-wrapped names
    let maxLen = 0;
    for (const name of taskNames) {
      const nameLen = this.getVisibleLength(name.trim());
      // Only count names that won't wrap
      if (nameLen <= MAX_NAME_WIDTH) {
        maxLen = Math.max(maxLen, nameLen);
      }
    }

    // Use the max of actual names or MAX_NAME_WIDTH for consistency
    this.currentSuiteMaxNameLen = Math.max(maxLen, MAX_NAME_WIDTH);
  }

  onSuiteStart(suite: string): void {
    this.currentSuite = suite;

    if (this.quiet) {
      return;
    }

    this.suiteResults = []; // Reset buffer for new suite

    // Skip displaying the implicit "default" suite header
    if (suite === 'default') {
      return;
    }

    this.printLine();
    const suiteMarker = `${colors.magenta}${ansiChars.block.light}${ansiChars.block.light}${colors.reset}`;
    this.printLine(
      `  ${suiteMarker} ${this.colorize('bold', this.colorize('brightWhite', suite))}`,
    );
  }

  onTaskResult(result: TaskResult): void {
    if (this.quiet) {
      return;
    }

    // Always buffer the result for suite summary (including aborted tasks)
    this.suiteResults.push(result);

    // Skip printing aborted tasks (they're counted in summary but not shown individually)
    if (result.aborted) {
      return;
    }

    // Print immediately with current alignment
    this.printTaskResult(result);
  }

  onTaskStart(task: string): void {
    if (this.quiet) {
      return;
    }

    // Only show static markers in verbose mode
    if (this.verbose) {
      this.printLine(
        `    ${this.colorize('gray', ansiChars.smallSquare)} ${task}`,
      );
    }
  }

  /**
   * Clear current progress display
   */
  private clearProgress(): void {
    this.clearProgressWindow();
    this.lastProgressLine = '';
  }

  /**
   * Clear the progress window at the bottom (Vitest-style)
   */
  private clearProgressWindow(): void {
    if (!process.stdout.isTTY || !this.progressWindowActive) {
      return;
    }
    // Move up and clear two lines (blank line + progress line)
    // '\x1b[1A' moves cursor up one line, '\x1b[K' clears the current line
    // This sequence moves up and clears two lines in total
    process.stdout.write('\x1b[1A\x1b[K\x1b[1A\x1b[K');
    this.progressWindowActive = false;
  }

  /**
   * Apply color to text if colors are enabled
   */
  private colorize(color: keyof typeof colors, text: string): string {
    if (!this.useColor) {
      return text;
    }
    return `${colors[color]}${text}${colors.reset}`;
  }

  /**
   * Format duration in human-readable format for progress display
   */
  private formatTimeRemaining(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h${minutes}m`;
    }
  }

  /**
   * Get visible length of string (excluding ANSI escape codes)
   */
  private getVisibleLength(str: string): number {
    // Remove ANSI escape codes to get actual visible length
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '').length;
  }

  /**
   * Print all task results in a suite with aligned columns
   */
  private printAlignedSuiteResults(): void {
    if (this.suiteResults.length === 0) {
      return;
    }

    const BASE_INDENT = '    '; // 4 spaces
    const bullet = this.colorize(
      'dim',
      this.colorize('gray', ansiChars.bullet),
    );

    // Calculate maximum name width based on terminal width
    // Reserve space for: indent (4) + status (1) + space (1) + name + ": " (2) + stats (~60 chars)
    const terminalWidth = process.stdout.columns || 80;
    const STATS_RESERVED_WIDTH = 70; // Approx space for duration + rme + ops/sec with padding
    const MAX_NAME_WIDTH = Math.max(
      40,
      Math.min(
        60,
        terminalWidth - BASE_INDENT.length - 2 - 2 - STATS_RESERVED_WIDTH,
      ),
    );

    // Prepare formatted data for each task
    interface FormattedTask {
      durationLen: number;
      durationStr: string;
      error: boolean;
      errorMessage?: string;
      iterations: number;
      iterationsLen: number;
      iterationsStr: string;
      lowIterations: boolean;
      name: string;
      nameLength: number;
      opsPerSecLen: number;
      opsPerSecStr: string;
      rmeLen: number;
      rmeStr: string;
      status: string;
    }

    // Filter out aborted tasks (they're counted in suite summary but not printed)
    const formatted: FormattedTask[] = this.suiteResults
      .filter((result) => !result.aborted)
      .map((result) => {
        const status = result.error
          ? this.colorize('red', ansiChars.cross)
          : this.colorize('brightCyan', ansiChars.checkmark);

        const name = result.name.trim();
        const nameLength = this.getVisibleLength(name);

        if (result.error) {
          return {
            durationLen: 0,
            durationStr: '',
            error: true,
            errorMessage: result.error?.message || String(result.error),
            iterations: 0,
            iterationsLen: 0,
            iterationsStr: '',
            lowIterations: false,
            name,
            nameLength,
            opsPerSecLen: 0,
            opsPerSecStr: '',
            rmeLen: 0,
            rmeStr: '',
            status,
          };
        }

        const duration = BaseReporter.formatDuration(result.mean); // already in nanoseconds
        const opsPerSec = BaseReporter.formatOpsPerSecond(result.opsPerSecond);
        const rme = BaseReporter.formatPercentage(result.marginOfError); // already a percentage
        const iterationsStr = `(${result.iterations} iter)`;
        const lowIterations = result.iterations < MIN_RELIABLE_ITERATIONS;

        return {
          durationLen: this.getVisibleLength(duration),
          durationStr: duration,
          error: false,
          iterations: result.iterations,
          iterationsLen: iterationsStr.length,
          iterationsStr,
          lowIterations,
          name,
          nameLength,
          opsPerSecLen: this.getVisibleLength(opsPerSec),
          opsPerSecStr: opsPerSec,
          rmeLen: this.getVisibleLength(rme),
          rmeStr: rme,
          status,
        };
      });

    // Find max widths
    const nonWrappingTasks = formatted.filter(
      (t) => t.nameLength <= MAX_NAME_WIDTH,
    );
    const maxNameLen =
      nonWrappingTasks.length > 0
        ? Math.max(...nonWrappingTasks.map((t) => t.nameLength))
        : 40; // Default if all tasks wrap

    const maxDurationLen = Math.max(
      ...formatted.filter((t) => !t.error).map((t) => t.durationLen),
      0,
    );
    const maxRmeLen = Math.max(
      ...formatted.filter((t) => !t.error).map((t) => t.rmeLen),
      0,
    );
    const maxIterLen = Math.max(
      ...formatted.filter((t) => !t.error).map((t) => t.iterationsLen),
      0,
    );
    const maxOpsLen = Math.max(
      ...formatted.filter((t) => !t.error).map((t) => t.opsPerSecLen),
      0,
    );

    // Print each task with aligned columns
    for (const task of formatted) {
      if (task.error) {
        // Track failure for end summary
        this.failures.push({
          error: task.errorMessage || 'Unknown error',
          file: this.currentFile,
          suite: this.currentSuite,
          task: task.name,
        });

        this.printLine(
          `${BASE_INDENT}${task.status} ${this.colorize('white', task.name)} ${this.colorize('red', 'FAILED')}`,
        );
      } else if (task.nameLength > MAX_NAME_WIDTH) {
        // Long name - wrap to multiple lines, align last line with short names
        const wrappedLines = this.wrapText(task.name, MAX_NAME_WIDTH);
        const continueIndent = BASE_INDENT + '  '; // 6 spaces for continuation lines

        // Format stats string with iterations
        const durationPad = ' '.repeat(maxDurationLen - task.durationLen);
        const rmePad = ' '.repeat(maxRmeLen - task.rmeLen);
        const iterPad = ' '.repeat(maxIterLen - task.iterationsLen);
        const opsPad = ' '.repeat(maxOpsLen - task.opsPerSecLen);
        const iterColor = task.lowIterations ? 'brightRed' : 'cyan';
        const statsStr = `${durationPad}${this.colorize('cyan', task.durationStr)} ${bullet} ${ansiChars.plusMinus}${rmePad}${this.colorize('brightBlue', task.rmeStr)} ${iterPad}${this.colorize(iterColor, task.iterationsStr)} ${bullet} ${opsPad}${this.colorize('magenta', task.opsPerSecStr)}`;

        // Print first line with status
        this.printLine(
          `${BASE_INDENT}${task.status} ${this.colorize('white', wrappedLines[0]!)}`,
        );

        // Print middle continuation lines (all but first and last)
        for (let i = 1; i < wrappedLines.length - 1; i++) {
          this.printLine(
            `${continueIndent}${this.colorize('white', wrappedLines[i]!)}`,
          );
        }

        // Print last line with colon and stats aligned with short names
        if (wrappedLines.length > 1) {
          const lastLine = wrappedLines[wrappedLines.length - 1]!;
          const lastLineLen = this.getVisibleLength(lastLine);
          // Pad the last line to align the ':' with short names
          const lastLinePad = ' '.repeat(Math.max(0, maxNameLen - lastLineLen));
          this.printLine(
            `${continueIndent}${this.colorize('white', lastLine)}${lastLinePad}: ${statsStr}`,
          );
        } else {
          // Single wrapped line
          const lastLinePad = ' '.repeat(maxNameLen - task.nameLength);
          this.printLine(
            `${BASE_INDENT}${task.status} ${this.colorize('white', task.name)}${lastLinePad}: ${statsStr}`,
          );
        }

        // Track low iteration count
        if (task.lowIterations) {
          this.lowIterationCount++;
        }
      } else {
        // Normal length - align on same line
        const namePad = ' '.repeat(maxNameLen - task.nameLength);
        const durationPad = ' '.repeat(maxDurationLen - task.durationLen);
        const rmePad = ' '.repeat(maxRmeLen - task.rmeLen);
        const iterPad = ' '.repeat(maxIterLen - task.iterationsLen);
        const opsPad = ' '.repeat(maxOpsLen - task.opsPerSecLen);
        const iterColor = task.lowIterations ? 'brightRed' : 'cyan';

        this.printLine(
          `${BASE_INDENT}${task.status} ${this.colorize('white', task.name)}${namePad}: ${durationPad}${this.colorize('cyan', task.durationStr)} ${bullet} ${ansiChars.plusMinus}${rmePad}${this.colorize('brightBlue', task.rmeStr)} ${iterPad}${this.colorize(iterColor, task.iterationsStr)} ${bullet} ${opsPad}${this.colorize('magenta', task.opsPerSecStr)}`,
        );

        // Track low iteration count
        if (task.lowIterations) {
          this.lowIterationCount++;
        }
      }
    }
  }

  /**
   * Print a line while maintaining the progress window at the bottom
   * (Vitest-style)
   */
  private printLine(message: string = ''): void {
    // Clear progress window, print content, re-render progress window
    this.clearProgressWindow();
    console.log(message);
    this.renderProgressWindow();
  }

  /**
   * Print a single task result immediately with current alignment
   */
  private printTaskResult(result: TaskResult): void {
    // Clear progress bar temporarily
    this.clearProgress();

    const BASE_INDENT = '    '; // 4 spaces
    const bullet = this.colorize(
      'dim',
      this.colorize('gray', ansiChars.bullet),
    );

    // Calculate terminal width constraints
    const terminalWidth = process.stdout.columns || 80;
    const STATS_RESERVED_WIDTH = 70;
    const MAX_NAME_WIDTH = Math.max(
      40,
      Math.min(
        60,
        terminalWidth - BASE_INDENT.length - 2 - 2 - STATS_RESERVED_WIDTH,
      ),
    );

    // Status marker
    const status = result.error
      ? this.colorize('red', ansiChars.cross)
      : this.colorize('brightCyan', ansiChars.checkmark);

    const name = result.name.trim();
    const nameLength = this.getVisibleLength(name);

    // Handle errors
    if (result.error) {
      this.failures.push({
        error: result.error?.message || String(result.error),
        file: this.currentFile,
        suite: this.currentSuite,
        task: name,
      });

      this.printLine(
        `${BASE_INDENT}${status} ${this.colorize('white', name)} ${this.colorize('red', 'FAILED')}`,
      );
      return;
    }

    // Format stats
    const duration = BaseReporter.formatDuration(result.mean);
    const opsPerSec = BaseReporter.formatOpsPerSecond(result.opsPerSecond);
    const rme = BaseReporter.formatPercentage(result.marginOfError);
    const iterationsStr = `(${result.iterations} iter)`;
    const lowIterations = result.iterations < MIN_RELIABLE_ITERATIONS;

    // Use fixed widths for stats columns (reasonable maximums)
    const DURATION_WIDTH = 10; // "999.99ms" max
    const RME_WIDTH = 8; // "±999.99%" max
    const ITER_WIDTH = 12; // "(99999 iter)" max
    const OPS_WIDTH = 15; // "999.99K ops/sec" max

    const durationLen = this.getVisibleLength(duration);
    const rmeLen = this.getVisibleLength(rme);
    const iterLen = iterationsStr.length;
    const opsLen = this.getVisibleLength(opsPerSec);

    // Stats formatting with fixed widths
    const durationPad = ' '.repeat(Math.max(0, DURATION_WIDTH - durationLen));
    const rmePad = ' '.repeat(Math.max(0, RME_WIDTH - rmeLen));
    const iterPad = ' '.repeat(Math.max(0, ITER_WIDTH - iterLen));
    const opsPad = ' '.repeat(Math.max(0, OPS_WIDTH - opsLen));
    const iterColor = lowIterations ? 'brightRed' : 'cyan';
    const statsStr = `${durationPad}${this.colorize('cyan', duration)} ${bullet} ${ansiChars.plusMinus}${rmePad}${this.colorize('brightBlue', rme)} ${iterPad}${this.colorize(iterColor, iterationsStr)} ${bullet} ${opsPad}${this.colorize('magenta', opsPerSec)}`;

    // Handle long names (wrap)
    if (nameLength > MAX_NAME_WIDTH) {
      const wrappedLines = this.wrapText(name, MAX_NAME_WIDTH);
      const continueIndent = BASE_INDENT + '  '; // 6 spaces for continuation lines

      // Print first line with status
      this.printLine(
        `${BASE_INDENT}${status} ${this.colorize('white', wrappedLines[0]!)}`,
      );

      // Print middle lines (all but first and last)
      for (let i = 1; i < wrappedLines.length - 1; i++) {
        this.printLine(
          `${continueIndent}${this.colorize('white', wrappedLines[i]!)}`,
        );
      }

      // Print last line with colon and stats aligned
      // Use pre-calculated currentSuiteMaxNameLen for perfect alignment
      if (wrappedLines.length > 1) {
        const lastLine = wrappedLines[wrappedLines.length - 1]!;
        const lastLineLen = this.getVisibleLength(lastLine);
        const lastLinePad = ' '.repeat(
          Math.max(0, this.currentSuiteMaxNameLen - lastLineLen),
        );
        this.printLine(
          `${continueIndent}${this.colorize('white', lastLine)}${lastLinePad}: ${statsStr}`,
        );
      } else {
        // Single wrapped line (shouldn't happen if nameLength > MAX but handle it)
        const lastLinePad = ' '.repeat(
          Math.max(0, this.currentSuiteMaxNameLen - nameLength),
        );
        this.printLine(
          `${BASE_INDENT}${status} ${this.colorize('white', name)}${lastLinePad}: ${statsStr}`,
        );
      }
    } else {
      // Normal length - print on same line with pre-calculated alignment
      const namePad = ' '.repeat(
        Math.max(0, this.currentSuiteMaxNameLen - nameLength),
      );

      this.printLine(
        `${BASE_INDENT}${status} ${this.colorize('white', name)}${namePad}: ${statsStr}`,
      );
    }

    // Track low iteration count
    if (lowIterations) {
      this.lowIterationCount++;
    }
  }

  /**
   * Render the progress window at the bottom
   */
  private renderProgressWindow(): void {
    if (!process.stdout.isTTY || !this.lastProgressLine) {
      return;
    }

    // Clear existing window if present
    if (this.progressWindowActive) {
      this.clearProgressWindow();
    }

    // Write blank line for spacing, then progress line
    console.log('');
    console.log(this.lastProgressLine);
    this.progressWindowActive = true;
  }

  /**
   * Wrap text to a maximum width, breaking at word boundaries when possible
   */
  private wrapText(text: string, maxWidth: number): string[] {
    if (this.getVisibleLength(text) <= maxWidth) {
      return [text];
    }

    const lines: string[] = [];
    let currentLine = '';

    const words = text.split(/(\s+)/); // Keep whitespace in split

    for (const word of words) {
      const testLine = currentLine + word;
      if (this.getVisibleLength(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        // If current line has content, save it
        if (currentLine.trim()) {
          lines.push(currentLine.trimEnd());
          currentLine = word.trim() + ' ';
        } else {
          // Single word is too long, force break it
          if (this.getVisibleLength(word) > maxWidth) {
            lines.push(word.substring(0, maxWidth));
            currentLine = word.substring(maxWidth);
          } else {
            currentLine = word;
          }
        }
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trimEnd());
    }

    return lines;
  }
}
