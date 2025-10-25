/**
 * ModestBench Human-Readable Console Reporter
 *
 * Provides colorized, progressive output for terminal environments. Displays
 * real-time progress, results, and formatted statistics.
 */

import path from 'node:path';

import type {
  BenchmarkRun,
  FileResult,
  ProgressState,
  SuiteResult,
  TaskResult,
} from '../types/index.js';

import { BaseReporter } from '../services/reporter-registry.js';
import { ansiChars, colors } from '../utils/ansi.js';

/**
 * Human-readable console reporter with colorized output
 */
export class HumanReporter extends BaseReporter {
  private currentFile = '';

  private currentSuite = '';

  private failures: Array<{
    error: string;
    file: string;
    suite: string;
    task: string;
  }> = [];

  private lastProgressLine = '';

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

    for (const file of run.files) {
      totalSuites += file.suites.length;
      for (const suite of file.suites) {
        totalPassed += suite.tasks.filter((t: TaskResult) => !t.error).length;
        totalFailed += suite.tasks.filter((t: TaskResult) => t.error).length;
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
      `${this.colorize('brightBlue', '  Tasks:')} ${this.colorize('brightWhite', String(totalPassed + totalFailed))}`,
    );
    if (totalFailed > 0) {
      this.printLine(
        `${this.colorize('brightRed', ansiChars.cross + ' Failed:')} ${this.colorize('brightWhite', String(totalFailed))}`,
      );
      this.printLine(
        `${this.colorize('brightCyan', ansiChars.checkmark + ' Passed:')} ${this.colorize('brightWhite', String(totalPassed))}`,
      );
    } else {
      this.printLine(
        `${this.colorize('brightCyan', ansiChars.checkmark + ' All tasks passed:')} ${this.colorize('brightWhite', String(totalPassed))}`,
      );
    }
    this.printLine(
      `${this.colorize('cyan', ansiChars.approx + ' Duration:')} ${this.colorize('brightWhite', this.formatDuration(duration * 1000000))}`,
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
          const displayPath = this.formatPath(failure.file);
          this.printLine(
            `  ${this.colorize('dim', displayPath)} ${this.colorize('dim', '›')} ${this.colorize('white', failure.suite)} ${this.colorize('dim', '›')} ${this.colorize('brightWhite', failure.task)}`,
          );
          this.printLine(`    ${this.colorize('brightRed', failure.error)}`);
          this.printLine();
        }
      }
    } else {
      const successMessage = `${this.colorize('brightMagenta', 'Rad. ☮')}`;
      this.printLine(successMessage);
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
        ` ${this.colorize('magenta', ansiChars.checkmark)} ${totalPassed > 1 ? this.colorize('brightMagenta', 'All ') : ''}${this.colorize('bold', this.colorize('brightMagenta', `${totalPassed}`))} ${this.colorize('brightMagenta', `${this.pluralize('task', totalPassed)} passed`)}`,
      );
    }

    this.printLine();
  }

  onFileStart(file: string): void {
    this.currentFile = file;

    if (this.quiet) {
      return;
    }

    const displayPath = this.formatPath(file);
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

    const { elapsed, percentage, tasksCompleted, totalTasks } = state;

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
    let padWidth = elapsedStrRaw.length;
    if (tasksCompleted > 0) {
      const avgTimePerTask = elapsed / tasksCompleted;
      const remainingTasks = totalTasks - tasksCompleted;
      const etaMs = avgTimePerTask * remainingTasks;
      const etaSeconds = Math.round(etaMs / 1000);
      const etaTimeStr = this.formatTimeRemaining(etaSeconds);
      padWidth = Math.max(padWidth, etaTimeStr.length);
      etaStr = ` ${this.colorize('dim', '|')} ${this.colorize('dim', 'ETA:')} ${this.colorize('brightBlue', etaTimeStr)}`;
    }

    // Pad elapsed time to match the longest time string
    const elapsedStr = elapsedStrRaw.padStart(padWidth, ' ');

    const roundedPercentage = percentage.toFixed(2);
    const line = `${this.colorize('brightCyan', ansiChars.approx)} ${this.colorize('white', paddedTasksCompleted)}${this.colorize('dim', '/')}${this.colorize('white', String(totalTasks))} ${this.colorize('dim', 'tasks')} ${this.colorize('dim', '(')}${this.colorize('brightBlue', roundedPercentage + '%')}${this.colorize('dim', ')')} ${this.colorize('dim', '|')} ${this.colorize('dim', 'Elapsed:')} ${this.colorize('cyan', elapsedStr)}${etaStr}`;

    this.lastProgressLine = line;
    this.renderProgressWindow();
  }

  onStart(run: BenchmarkRun): void {
    this.startTime = Date.now();
    this.failures = []; // Reset failures for new run
    this.lastProgressLine = ''; // Reset for new run

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
    \x1b[49;38;5;0m▀▀\x1b[38;5;0;48;5;6m▄\x1b[38;5;232;48;5;14m▄\x1b[38;5;38;48;5;14m▄\x1b[48;5;14m           \x1b[38;5;30;48;5;14m▄\x1b[38;5;0;48;5;14m▄\x1b[38;5;0;48;5;23m▄\x1b[49;38;5;0m▀▀\x1b[m \x1b[2mmem:\x1b[m \x1b[36m${this.formatBytes(run.environment.memory.total)} \x1b[m
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

    // Print all buffered task results with aligned columns
    this.printAlignedSuiteResults();

    // Skip displaying summary for the implicit "default" suite
    if (result.name === 'default') {
      return;
    }

    const passed = result.tasks.filter((t) => !t.error).length;
    const failed = result.tasks.filter((t) => t.error).length;

    if (failed > 0) {
      this.printLine(
        `  ${this.colorize('red', `${ansiChars.cross} ${failed} failed`)}, ${this.colorize('green', `${passed} passed`)}`,
      );
    } else {
      this.printLine(
        `  ${this.colorize('magenta', ansiChars.checkmark)} ${this.colorize('bold', this.colorize('brightWhite', `${passed}`))} ${this.colorize('brightWhite', `${this.pluralize('task', passed)} passed`)}`,
      );
    }
    this.printLine();
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

    // Buffer the result for later printing with proper alignment
    this.suiteResults.push(result);
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
   * Format bytes in human-readable format
   */
  private formatBytes(bytes: number): string {
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
  private formatPath(filePath: string): string {
    const cwd = process.cwd();
    const absolutePath = path.resolve(filePath);

    // Check if the file is within the current working directory
    if (absolutePath.startsWith(cwd + path.sep) || absolutePath === cwd) {
      return path.relative(cwd, absolutePath);
    }

    return absolutePath;
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
   * Simple pluralization helper
   */
  private pluralize(str: string, count: number): string {
    return count === 1 ? str : `${str}s`;
  }

  /**
   * Print all task results in a suite with aligned columns
   */
  private printAlignedSuiteResults(): void {
    if (this.suiteResults.length === 0) {
      return;
    }

    const MAX_NAME_WIDTH = 60;
    const BASE_INDENT = '    '; // 4 spaces
    const bullet = this.colorize(
      'dim',
      this.colorize('gray', ansiChars.bullet),
    );

    // Prepare formatted data for each task
    interface FormattedTask {
      durationLen: number;
      durationStr: string;
      error: boolean;
      errorMessage?: string;
      iterations: number;
      name: string;
      nameLength: number;
      opsPerSecLen: number;
      opsPerSecStr: string;
      rmeLen: number;
      rmeStr: string;
      status: string;
    }

    const formatted: FormattedTask[] = this.suiteResults.map((result) => {
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
          name,
          nameLength,
          opsPerSecLen: 0,
          opsPerSecStr: '',
          rmeLen: 0,
          rmeStr: '',
          status,
        };
      }

      const duration = this.formatDuration(result.mean); // already in nanoseconds
      const opsPerSec = this.formatOpsPerSecond(result.opsPerSecond);
      const rme = this.formatPercentage(result.marginOfError * 100);

      return {
        durationLen: this.getVisibleLength(duration),
        durationStr: duration,
        error: false,
        iterations: result.iterations,
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
    const maxOpsLen = Math.max(
      ...formatted.filter((t) => !t.error).map((t) => t.opsPerSecLen),
      0,
    );

    // Calculate the position where numbers start for unwrapped lines
    // BASE_INDENT (4) + status (1 char) + space (1) + maxNameLen + ": " (2) = 8 + maxNameLen
    const numbersStartPos = BASE_INDENT.length + 2 + maxNameLen + 2;

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
        // Long name - wrap to next line, but align numbers with unwrapped lines
        this.printLine(
          `${BASE_INDENT}${task.status} ${this.colorize('white', task.name)}:`,
        );

        // Calculate padding to align with unwrapped lines
        // We need to get to numbersStartPos from the beginning of the line
        const leadingPad = ' '.repeat(numbersStartPos);
        const durationPad = ' '.repeat(maxDurationLen - task.durationLen);
        const rmePad = ' '.repeat(maxRmeLen - task.rmeLen);
        const opsPad = ' '.repeat(maxOpsLen - task.opsPerSecLen);

        this.printLine(
          `${leadingPad}${durationPad}${this.colorize('cyan', task.durationStr)} ${bullet} ${ansiChars.plusMinus}${rmePad}${this.colorize('brightBlue', task.rmeStr)} ${bullet} ${opsPad}${this.colorize('magenta', task.opsPerSecStr)}`,
        );

        if (this.verbose && task.iterations > 0) {
          this.printLine(
            `      ${this.colorize('dim', `${task.iterations} iterations`)}`,
          );
        }
      } else {
        // Normal length - align on same line
        const namePad = ' '.repeat(maxNameLen - task.nameLength);
        const durationPad = ' '.repeat(maxDurationLen - task.durationLen);
        const rmePad = ' '.repeat(maxRmeLen - task.rmeLen);
        const opsPad = ' '.repeat(maxOpsLen - task.opsPerSecLen);

        this.printLine(
          `${BASE_INDENT}${task.status} ${this.colorize('white', task.name)}${namePad}: ${durationPad}${this.colorize('cyan', task.durationStr)} ${bullet} ${ansiChars.plusMinus}${rmePad}${this.colorize('brightBlue', task.rmeStr)} ${bullet} ${opsPad}${this.colorize('magenta', task.opsPerSecStr)}`,
        );

        if (this.verbose && task.iterations > 0) {
          this.printLine(
            `      ${this.colorize('dim', `${task.iterations} iterations`)}`,
          );
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
}
