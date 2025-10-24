/**
 * ModestBench Simple Console Reporter
 *
 * Provides plain text output without colors, ANSI codes, or decorative
 * elements. Ideal for CI/CD environments, piping, or non-TTY outputs.
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
 * Basic symbols for plain text output
 */
const symbols = {
  approx: '≈',
  checkmark: '√',
  cross: '×',
  plusMinus: '±',
} as const;

/**
 * Simple console reporter with plain text output (no colors or progress bars)
 */
export class SimpleReporter extends BaseReporter {
  private currentFile = '';

  private currentSuite = '';

  private failures: Array<{
    error: string;
    file: string;
    suite: string;
    task: string;
  }> = [];

  private readonly quiet: boolean;

  private startTime = 0;

  private suiteResults: TaskResult[] = [];

  private readonly verbose: boolean;

  constructor(
    options: {
      quiet?: boolean;
      verbose?: boolean;
    } = {},
  ) {
    super('simple', options);

    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;
  }

  onEnd(run: BenchmarkRun): void {
    if (this.quiet) {
      return;
    }

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
    console.log('== Results');
    console.log();

    if (totalFailed > 0) {
      console.log(`${symbols.cross} Failed: ${totalFailed}`);
      console.log(`${symbols.checkmark} Passed: ${totalPassed}`);
    } else {
      console.log(`${symbols.checkmark} All tasks passed: ${totalPassed}`);
    }

    console.log(`- Files: ${totalFiles}`);
    console.log(`- Suites: ${totalSuites}`);
    console.log(
      `${symbols.approx} Duration: ${this.formatDuration(duration * 1e6)}`,
    );
    console.log();

    if (totalFailed > 0) {
      console.log(`${symbols.cross.repeat(3)} Some benchmarks failed`);

      // Display failed tasks with details
      if (this.failures.length > 0) {
        console.log();
        console.log('Failed Tasks:');
        console.log();

        for (const failure of this.failures) {
          const displayPath = this.formatPath(failure.file);
          console.log(`  ${displayPath} > ${failure.suite} > ${failure.task}`);
          console.log(`    ${failure.error}`);
          console.log();
        }
      }
    } else {
      console.log('All benchmarks completed successfully!');
    }
  }

  onError(error: Error): void {
    if (this.quiet) {
      return;
    }

    console.error(`${symbols.cross.repeat(3)} Error:`, error.message);

    if (this.verbose && error.stack) {
      console.error(error.stack);
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
        `  ${symbols.cross} ${totalFailed} failed, ${totalPassed} passed`,
      );
    } else {
      console.log(
        ` ${symbols.checkmark} ${totalPassed > 1 ? 'All ' : ''}${totalPassed} ${this.pluralize('task', totalPassed)} passed`,
      );
    }

    console.log();
  }

  onFileStart(file: string): void {
    this.currentFile = file;

    if (this.quiet) {
      return;
    }

    const displayPath = this.formatPath(file);
    console.log(`-- ${displayPath}`);
  }

  onProgress(_state: ProgressState): void {
    // Simple reporter does not display progress bars
    return;
  }

  onStart(run: BenchmarkRun): void {
    this.startTime = Date.now();
    this.failures = []; // Reset failures for new run

    if (this.quiet) {
      return;
    }

    console.log('modestbench');
    console.log();

    if (run.environment) {
      console.log(`  node.js: ${run.environment.nodeVersion}`);
      console.log(
        `  platform: ${run.environment.platform} ${run.environment.arch}`,
      );
      console.log(
        `  cpu: ${run.environment.cpu.model} (${run.environment.cpu.cores} cores)`,
      );
      console.log(`  mem: ${this.formatBytes(run.environment.memory.total)}`);
      console.log();
    }

    if (run.git) {
      console.log(`  Git: ${run.git.commit}`);
    }

    if (run.ci) {
      console.log(`  CI: ${run.ci.provider}`);
      console.log();
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
      console.log(`  ${symbols.cross} ${failed} failed, ${passed} passed`);
    } else {
      console.log(
        `  ${symbols.checkmark} ${passed} ${this.pluralize('task', passed)} passed`,
      );
    }
    console.log();
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

    console.log();
    console.log(`  -- ${suite}`);
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
      console.log(`    - ${task}`);
    }
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
    const separator = '-'; // Simple text separator instead of bullet

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
      const status = result.error ? symbols.cross : symbols.checkmark;

      const name = result.name.trim();
      const nameLength = name.length;

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

      const duration = this.formatDuration(result.mean * 1e9);
      const opsPerSec = this.formatOpsPerSecond(result.opsPerSecond);
      const rme = this.formatPercentage(result.marginOfError * 100);

      return {
        durationLen: duration.length,
        durationStr: duration,
        error: false,
        iterations: result.iterations,
        name,
        nameLength,
        opsPerSecLen: opsPerSec.length,
        opsPerSecStr: opsPerSec,
        rmeLen: rme.length,
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

        console.log(`${BASE_INDENT}${task.status} ${task.name} FAILED`);
      } else if (task.nameLength > MAX_NAME_WIDTH) {
        // Long name - wrap to next line, but align numbers with unwrapped lines
        console.log(`${BASE_INDENT}${task.status} ${task.name}:`);

        // Calculate padding to align with unwrapped lines
        // We need to get to numbersStartPos from the beginning of the line
        const leadingPad = ' '.repeat(numbersStartPos);
        const durationPad = ' '.repeat(maxDurationLen - task.durationLen);
        const rmePad = ' '.repeat(maxRmeLen - task.rmeLen);
        const opsPad = ' '.repeat(maxOpsLen - task.opsPerSecLen);

        console.log(
          `${leadingPad}${durationPad}${task.durationStr} ${separator} ${symbols.plusMinus}${rmePad}${task.rmeStr} ${separator} ${opsPad}${task.opsPerSecStr}`,
        );

        if (this.verbose && task.iterations > 0) {
          console.log(`      ${task.iterations} iterations`);
        }
      } else {
        // Normal length - align on same line
        const namePad = ' '.repeat(maxNameLen - task.nameLength);
        const durationPad = ' '.repeat(maxDurationLen - task.durationLen);
        const rmePad = ' '.repeat(maxRmeLen - task.rmeLen);
        const opsPad = ' '.repeat(maxOpsLen - task.opsPerSecLen);

        console.log(
          `${BASE_INDENT}${task.status} ${task.name}${namePad}: ${durationPad}${task.durationStr} ${separator} ${symbols.plusMinus}${rmePad}${task.rmeStr} ${separator} ${opsPad}${task.opsPerSecStr}`,
        );

        if (this.verbose && task.iterations > 0) {
          console.log(`      ${task.iterations} iterations`);
        }
      }
    }
  }
}
