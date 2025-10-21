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

import { BaseReporter } from './registry.js';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  brightBlue: '\x1b[94m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  white: '\x1b[37m',
  yellow: '\x1b[33m',
} as const;

/**
 * Spinner characters for progress indication
 */
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Human-readable console reporter with colorized output
 */
export class HumanReporter extends BaseReporter {
  private lastProgressLine = '';

  private progressTimer?: NodeJS.Timeout | null | undefined;

  private readonly quiet: boolean;

  private readonly showProgress: boolean;

  private spinnerIndex = 0;

  private startTime = 0;

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

    this.showProgress = options.progress ?? true;
    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;
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

    console.log(this.colorize('bold', '📊 Results'));
    console.log();

    if (totalFailed > 0) {
      console.log(`${this.colorize('red', '✗ Failed:')} ${totalFailed}`);
      console.log(`${this.colorize('green', '✓ Passed:')} ${totalPassed}`);
    } else {
      console.log(
        `${this.colorize('green', '✓ All tests passed:')} ${totalPassed}`,
      );
    }

    console.log(`${this.colorize('brightBlue', '📁 Files:')} ${totalFiles}`);
    console.log(`${this.colorize('brightBlue', '📊 Suites:')} ${totalSuites}`);
    console.log(
      `${this.colorize('brightBlue', '⏱️ Duration:')} ${this.formatDuration(duration * 1000000)}`,
    );
    console.log();

    if (totalFailed > 0) {
      console.log(this.colorize('red', '❌ Some benchmarks failed'));
    } else {
      console.log(
        this.colorize('green', '🎉 All benchmarks completed successfully!'),
      );
    }
  }

  onError(error: Error): void {
    if (this.quiet) {
      return;
    }

    this.clearProgress();
    console.error(this.colorize('red', '❌ Error:'), error.message);

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
      console.log(
        this.colorize(
          'red',
          `  ✗ ${totalFailed} failed, ${totalPassed} passed`,
        ),
      );
    } else {
      console.log(
        this.colorize('green', `  ✓ All ${totalPassed} tasks passed`),
      );
    }

    console.log();
  }

  onFileStart(file: string): void {
    if (this.quiet) {
      return;
    }

    this.clearProgress();
    const displayPath = this.formatPath(file);
    console.log(this.colorize('bold', `▶ ${displayPath}`));
  }

  onProgress(state: ProgressState): void {
    if (this.quiet || !this.showProgress) {
      return;
    }

    const { elapsed, percentage, tasksCompleted, totalTasks } = state;
    const progressMessage = `${tasksCompleted}/${totalTasks} tasks (${percentage}%) | Elapsed: ${Math.round(elapsed / 1000)}s`;

    if (process.stdout.isTTY) {
      // TTY mode: use progress bar (existing logic)
      if ((this.options.verbose as number) > 0) {
        // Verbose mode in TTY - show ETA if available
        if (tasksCompleted > 0) {
          const avgTimePerTask = elapsed / tasksCompleted;
          const remainingTasks = totalTasks - tasksCompleted;
          const etaMs = avgTimePerTask * remainingTasks;
          const etaStr = `${Math.round(etaMs / 1000)}s`;
          console.log(`⏳ ${progressMessage} | ETA: ${etaStr}`);
        }
      }
    } else {
      // Non-TTY mode: show progress text with ETA when available
      if (tasksCompleted > 0) {
        const avgTimePerTask = elapsed / tasksCompleted;
        const remainingTasks = totalTasks - tasksCompleted;
        const etaMs = avgTimePerTask * remainingTasks;
        const etaStr = `${Math.round(etaMs / 1000)}s`;
        console.log(`⏳ ${progressMessage} | ETA: ${etaStr}`);
      } else if ((this.options.verbose as number) > 0) {
        console.log(`⏳ ${progressMessage}`);
      }
    }
  }

  onStart(run: BenchmarkRun): void {
    if (this.quiet) {
      return;
    }

    this.startTime = Date.now();
    this.clearLine();

    console.log(this.colorize('bold', '🚀 ModestBench'));
    console.log();

    if (run.environment) {
      console.log(this.colorize('dim', 'Environment:'));
      console.log(
        `  Node.js: ${this.colorize('cyan', run.environment.nodeVersion)}`,
      );
      console.log(
        `  Platform: ${this.colorize('cyan', `${run.environment.platform} ${run.environment.arch}`)}`,
      );
      console.log(
        `  CPU: ${this.colorize('cyan', run.environment.cpu.model)} (${run.environment.cpu.cores} cores)`,
      );
      console.log(
        `  Memory: ${this.colorize('cyan', this.formatBytes(run.environment.memory.total))}`,
      );
      console.log();
    }

    if (run.git) {
      console.log(`  Git: ${this.colorize('cyan', run.git.commit)}`);
    }

    if (run.ci) {
      console.log(`  CI: ${this.colorize('cyan', run.ci.provider)}`);
      console.log();
    }
  }

  onSuiteEnd(result: SuiteResult): void {
    if (this.quiet) {
      return;
    }

    // Skip displaying summary for the implicit "default" suite
    if (result.name === 'default') {
      return;
    }

    const passed = result.tasks.filter((t) => !t.error).length;
    const failed = result.tasks.filter((t) => t.error).length;

    if (failed > 0) {
      console.log(
        `  ${this.colorize('red', `✗ ${failed} failed`)}, ${this.colorize('green', `${passed} passed`)}`,
      );
    } else {
      console.log(`  ${this.colorize('green', `✓ ${passed} passed`)}`);
    }
    console.log();
  }

  onSuiteStart(suite: string): void {
    if (this.quiet) {
      return;
    }

    // Skip displaying the implicit "default" suite
    if (suite === 'default') {
      return;
    }

    this.clearLine();
    console.log();
    console.log(
      `  ${this.colorize('blue', '▶')} ${this.colorize('bold', suite)}`,
    );
  }

  onTaskResult(result: TaskResult): void {
    if (this.quiet) {
      return;
    }

    this.clearProgress();

    const status = result.error
      ? this.colorize('red', '✗')
      : this.colorize('green', '✓');

    if (result.error) {
      console.log(
        `    ${status} ${result.name} ${this.colorize('red', 'FAILED')}`,
      );
      if (this.verbose) {
        console.log(`      ${this.colorize('red', result.error.message)}`);
      }
    } else {
      const duration = this.formatDuration(result.mean * 1000000000); // Convert seconds to nanoseconds
      const opsPerSec = this.formatOpsPerSecond(result.opsPerSecond);
      const rme = this.formatPercentage(result.marginOfError * 100); // Convert decimal to percentage

      console.log(`    ${status} ${result.name}`);
      console.log(
        `      ${this.colorize('cyan', duration)} ${this.colorize('dim', '±')}${this.colorize('yellow', rme)} ${this.colorize('gray', '(')}${this.colorize('green', opsPerSec)}${this.colorize('gray', ')')}`,
      );

      if (this.verbose && result.iterations > 0) {
        console.log(
          `      ${this.colorize('dim', `${result.iterations} iterations`)}`,
        );
      }
    }
  }

  onTaskStart(task: string): void {
    if (this.quiet) {
      return;
    }

    if (this.showProgress) {
      this.startProgress(`Running ${task}...`);
    } else if (this.verbose) {
      console.log(`    ${this.colorize('gray', '●')} ${task}`);
    }
  }

  /**
   * Clear the current terminal line
   */
  private clearLine(): void {
    if (process.stdout.isTTY && this.lastProgressLine) {
      process.stdout.write(
        '\r' + ' '.repeat(this.lastProgressLine.length) + '\r',
      );
      this.lastProgressLine = '';
    }
  }

  /**
   * Clear current progress display
   */
  private clearProgress(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }

    this.clearLine();
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
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Start showing animated progress
   */
  private startProgress(message: string): void {
    if (!this.showProgress || !process.stdout.isTTY) {
      return;
    }

    this.clearProgress();
    this.spinnerIndex = 0;

    this.progressTimer = setInterval(() => {
      const frame = spinnerFrames[this.spinnerIndex % spinnerFrames.length];
      this.spinnerIndex++;

      const line = `${this.colorize('cyan', frame!)} ${message}`;
      this.updateProgressLine(line);
    }, 100);
    this.progressTimer.unref(); // Allow process to exit even if timer is active
  }

  /**
   * Update progress message without animation
   */
  private updateProgress(message: string): void {
    if (!this.showProgress || !process.stdout.isTTY) {
      return;
    }

    const line = `${this.colorize('blue', '⏳')} ${message}`;
    this.updateProgressLine(line);
  }

  /**
   * Update the current progress line
   */
  private updateProgressLine(line: string): void {
    if (!process.stdout.isTTY) {
      return;
    }

    // Clear the previous line
    if (this.lastProgressLine) {
      process.stdout.write(
        '\r' + ' '.repeat(this.lastProgressLine.length) + '\r',
      );
    }

    // Write the new line
    process.stdout.write(line);
    this.lastProgressLine = line;
  }
}
