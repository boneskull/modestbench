/**
 * ModestBench CSV Reporter
 *
 * Outputs benchmark results in CSV format for data analysis and visualization.
 * Provides structured tabular data suitable for spreadsheets and statistical
 * tools.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type {
  BenchmarkRun,
  BudgetResult,
  BudgetSummary,
  TaskId,
  TaskResult,
} from '../types/index.js';

import { ReporterOutputError } from '../errors/index.js';
import { BaseReporter } from '../services/reporter-registry.js';
import { createTaskId } from '../types/index.js';

/**
 * CSV column definitions for task results
 */
interface CsvRow {
  readonly arch: string;
  /** Budget passed: 1 (pass), 0 (fail), undefined (no budget) */
  readonly budgetPassed?: number | undefined;
  readonly budgetViolations?: string | undefined;
  readonly ciProvider?: string | undefined;
  readonly cpuCores: number;
  readonly cpuModel: string;
  readonly error?: string | undefined;
  readonly file: string;
  readonly gitBranch?: string | undefined;
  readonly gitCommit?: string | undefined;
  readonly iterations: number;
  readonly marginOfError: number;
  readonly max: number;
  readonly mean: number;
  readonly min: number;
  readonly nodeVersion: string;
  readonly opsPerSecond: number;
  readonly p95: number;
  readonly p99: number;
  readonly platform: string;
  readonly stdDev: number;
  readonly suite: string;
  readonly task: string;
  readonly timestamp: string;
  readonly totalMemory: number;
  readonly variance: number;
}

/**
 * CSV reporter for structured tabular output
 */
export class CsvReporter extends BaseReporter {
  private budgetResults: Map<TaskId, BudgetResult> = new Map();

  private currentFile = '';

  private currentRun?: BenchmarkRun;

  private currentSuite = '';

  private readonly delimiter: string;

  private readonly includeHeaders: boolean;

  private readonly includeMetadata: boolean;

  private readonly outputPath?: string | undefined;

  private readonly quote: string;

  private rows: CsvRow[] = [];

  constructor(
    options: {
      delimiter?: string;
      includeHeaders?: boolean;
      includeMetadata?: boolean;
      outputPath?: string;
      quiet?: boolean;
      quote?: string;
      verbose?: boolean;
    } = {},
  ) {
    super('csv', options);

    this.outputPath = options.outputPath;
    this.includeHeaders = options.includeHeaders ?? true;
    this.includeMetadata = options.includeMetadata ?? true;
    this.delimiter = options.delimiter ?? ',';
    this.quote = options.quote ?? '"';
  }

  /**
   * Check if headers are included
   */
  areHeadersIncluded(): boolean {
    return this.includeHeaders;
  }

  /**
   * Get the delimiter character
   */
  getDelimiter(): string {
    return this.delimiter;
  }

  /**
   * Get the output path (if configured)
   */
  getOutputPath(): string | undefined {
    return this.outputPath;
  }

  /**
   * Get the quote character
   */
  getQuote(): string {
    return this.quote;
  }

  /**
   * Get the number of rows collected
   */
  getRowCount(): number {
    return this.rows.length;
  }

  /**
   * Check if metadata is included
   */
  isMetadataIncluded(): boolean {
    return this.includeMetadata;
  }

  onBudgetResult(summary: BudgetSummary): void {
    // Store budget results indexed by taskId
    for (const result of summary.results) {
      this.budgetResults.set(result.taskId, result);
    }

    // Update existing rows with budget data (since onTaskResult is called before onBudgetResult)
    for (const row of this.rows) {
      // row.file is already relative to cwd
      const taskId = createTaskId(row.file, row.suite, row.task);
      const budgetResult = this.budgetResults.get(taskId);
      if (budgetResult) {
        // Need to cast to mutable to update readonly properties
        const mutableRow = row as {
          budgetPassed?: number;
          budgetViolations?: string;
        };
        mutableRow.budgetPassed = budgetResult.passed ? 1 : 0;
        mutableRow.budgetViolations = budgetResult.violations
          .map((v) => v.type)
          .join('; ');
      }
    }
  }

  async onEnd(_run: BenchmarkRun): Promise<void> {
    const csvContent = this.generateCsv();

    if (this.outputPath) {
      await this.writeToFile(csvContent);
    } else {
      this.writeToStdout(csvContent);
    }
  }

  onError(error: Error): void {
    console.error('CSV Reporter Error:', error.message);
  }

  onFileStart(file: string): void {
    this.currentFile = file;
  }

  onStart(run: BenchmarkRun): void {
    this.currentRun = run;
    this.rows = [];
  }

  onSuiteStart(suite: string): void {
    this.currentSuite = suite;
  }

  onTaskResult(result: TaskResult): void {
    if (!this.currentRun) {
      return;
    }

    // Look up budget result for this task
    // this.currentFile is already relative to cwd (comes from engine)
    const taskId = createTaskId(
      this.currentFile,
      this.currentSuite,
      result.name,
    );
    const budgetResult = this.budgetResults.get(taskId);

    const row: CsvRow = {
      arch: this.currentRun.environment.arch,
      budgetPassed: budgetResult ? (budgetResult.passed ? 1 : 0) : undefined,
      budgetViolations: budgetResult
        ? budgetResult.violations.map((v) => v.type).join('; ')
        : undefined,
      ciProvider: this.currentRun.ci?.provider,
      cpuCores: this.currentRun.environment.cpu.cores,
      cpuModel: this.currentRun.environment.cpu.model,
      error: result.error?.message,
      file: this.currentFile,
      gitBranch: this.currentRun.git?.branch,
      gitCommit: this.currentRun.git?.commit,
      iterations: result.iterations,
      marginOfError: result.marginOfError,
      max: result.max,
      mean: result.mean,
      min: result.min,
      nodeVersion: this.currentRun.environment.nodeVersion,
      opsPerSecond: result.opsPerSecond,
      p95: result.p95,
      p99: result.p99,
      platform: this.currentRun.environment.platform,
      stdDev: result.stdDev,
      suite: this.currentSuite,
      task: result.name,
      timestamp: new Date().toISOString(),
      totalMemory: this.currentRun.environment.memory.total,
      variance: result.variance,
    };

    this.rows.push(row);
  }

  /**
   * Escape a field value for CSV format
   */
  private escapeField(value: string): string {
    // If value contains delimiter, quote, or newline, wrap in quotes
    if (
      value.includes(this.delimiter) ||
      value.includes(this.quote) ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      // Escape any existing quotes by doubling them
      const escaped = value.replace(
        new RegExp(this.quote, 'g'),
        this.quote + this.quote,
      );
      return this.quote + escaped + this.quote;
    }

    return value;
  }

  /**
   * Generate CSV content from collected rows
   */
  private generateCsv(): string {
    if (this.rows.length === 0) {
      return this.includeHeaders ? this.generateHeaders() : '';
    }

    const lines: string[] = [];

    if (this.includeHeaders) {
      lines.push(this.generateHeaders());
    }

    for (const row of this.rows) {
      lines.push(this.generateRow(row));
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Generate CSV headers
   */
  private generateHeaders(): string {
    const headers = [
      'file',
      'suite',
      'task',
      'mean',
      'stdDev',
      'min',
      'max',
      'iterations',
      'opsPerSecond',
      'marginOfError',
      'variance',
      'p95',
      'p99',
      'error',
      'budgetPassed',
      'budgetViolations',
      'timestamp',
    ];

    if (this.includeMetadata) {
      headers.push(
        'nodeVersion',
        'platform',
        'arch',
        'cpuModel',
        'cpuCores',
        'totalMemory',
        'gitCommit',
        'gitBranch',
        'ciProvider',
      );
    }

    return headers.map((h) => this.escapeField(h)).join(this.delimiter);
  }

  /**
   * Generate a CSV row from a data row
   */
  private generateRow(row: CsvRow): string {
    const values = [
      row.file,
      row.suite,
      row.task,
      (row.mean ?? 0).toString(),
      (row.stdDev ?? 0).toString(),
      (row.min ?? 0).toString(),
      (row.max ?? 0).toString(),
      (row.iterations ?? 0).toString(),
      (row.opsPerSecond ?? 0).toString(),
      (row.marginOfError ?? 0).toString(),
      (row.variance ?? 0).toString(),
      (row.p95 ?? 0).toString(),
      (row.p99 ?? 0).toString(),
      row.error || '',
      row.budgetPassed !== undefined ? row.budgetPassed.toString() : '',
      row.budgetViolations || '',
      row.timestamp || '',
    ];

    if (this.includeMetadata) {
      values.push(
        row.nodeVersion || '',
        row.platform || '',
        row.arch || '',
        row.cpuModel || '',
        (row.cpuCores ?? 0).toString(),
        (row.totalMemory ?? 0).toString(),
        row.gitCommit || '',
        row.gitBranch || '',
        row.ciProvider || '',
      );
    }

    return values.map((v) => this.escapeField(v)).join(this.delimiter);
  }

  /**
   * Write CSV content to file
   */
  private async writeToFile(csvContent: string): Promise<void> {
    if (!this.outputPath) {
      throw new ReporterOutputError('Output path not specified');
    }

    try {
      // Ensure directory exists
      const dir = dirname(this.outputPath);
      mkdirSync(dir, { recursive: true });

      // Write CSV file
      writeFileSync(this.outputPath, csvContent, 'utf8');
    } catch (error) {
      throw new ReporterOutputError(
        `Failed to write CSV output to ${this.outputPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Write CSV content to stdout
   */
  private writeToStdout(csvContent: string): void {
    // Always write to stdout when no output path is specified
    // The quiet flag only affects progress messages (stderr), not data output
    console.log(csvContent);
  }
}
