/**
 * ModestBench CSV Reporter
 *
 * Outputs benchmark results in CSV format for data analysis and visualization.
 * Provides structured tabular data suitable for spreadsheets and statistical tools.
 */

import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import type {
  BenchmarkRun,
  TaskResult,
  SuiteResult,
  FileResult,
  ProgressState,
} from '../types/index.js';
import { BaseReporter } from './registry.js';

/**
 * CSV column definitions for task results
 */
interface CsvRow {
  readonly file: string;
  readonly suite: string;
  readonly task: string;
  readonly mean: number;
  readonly stdDev: number;
  readonly min: number;
  readonly max: number;
  readonly iterations: number;
  readonly opsPerSecond: number;
  readonly marginOfError: number;
  readonly variance: number;
  readonly p95: number;
  readonly p99: number;
  readonly error?: string | undefined;
  readonly timestamp: string;
  readonly nodeVersion: string;
  readonly platform: string;
  readonly arch: string;
  readonly cpuModel: string;
  readonly cpuCores: number;
  readonly totalMemory: number;
  readonly gitCommit?: string | undefined;
  readonly gitBranch?: string | undefined;
  readonly ciProvider?: string | undefined;
}

/**
 * CSV reporter for structured tabular output
 */
export class CsvReporter extends BaseReporter {
  private readonly outputPath?: string | undefined;
  private readonly includeHeaders: boolean;
  private readonly includeMetadata: boolean;
  private readonly delimiter: string;
  private readonly quote: string;
  private rows: CsvRow[] = [];
  private currentRun?: BenchmarkRun;
  private currentFile = '';
  private currentSuite = '';

  constructor(
    options: {
      outputPath?: string;
      includeHeaders?: boolean;
      includeMetadata?: boolean;
      delimiter?: string;
      quote?: string;
    } = {}
  ) {
    super('csv', options);

    this.outputPath = options.outputPath;
    this.includeHeaders = options.includeHeaders ?? true;
    this.includeMetadata = options.includeMetadata ?? true;
    this.delimiter = options.delimiter ?? ',';
    this.quote = options.quote ?? '"';
  }

  onStart(run: BenchmarkRun): void {
    this.currentRun = run;
    this.rows = [];
  }

  onFileStart(file: string): void {
    this.currentFile = file;
  }

  onSuiteStart(suite: string): void {
    this.currentSuite = suite;
  }

  onTaskStart(_task: string): void {
    // No-op for CSV reporter
  }

  onTaskResult(result: TaskResult): void {
    if (!this.currentRun) {
      return;
    }

    const row: CsvRow = {
      file: this.currentFile,
      suite: this.currentSuite,
      task: result.name,
      mean: result.mean,
      stdDev: result.stdDev,
      min: result.min,
      max: result.max,
      iterations: result.iterations,
      opsPerSecond: result.opsPerSecond,
      marginOfError: result.marginOfError,
      variance: result.variance,
      p95: result.p95,
      p99: result.p99,
      error: result.error?.message,
      timestamp: new Date().toISOString(),
      nodeVersion: this.currentRun.environment.nodeVersion,
      platform: this.currentRun.environment.platform,
      arch: this.currentRun.environment.arch,
      cpuModel: this.currentRun.environment.cpu.model,
      cpuCores: this.currentRun.environment.cpu.cores,
      totalMemory: this.currentRun.environment.memory.total,
      gitCommit: this.currentRun.git?.commit,
      gitBranch: this.currentRun.git?.branch,
      ciProvider: this.currentRun.ci?.provider,
    };

    this.rows.push(row);
  }

  onSuiteEnd(_result: SuiteResult): void {
    // No-op for CSV reporter
  }

  onFileEnd(_result: FileResult): void {
    // No-op for CSV reporter
  }

  async onEnd(_run: BenchmarkRun): Promise<void> {
    const csvContent = this.generateCsv();

    if (this.outputPath) {
      await this.writeToFile(csvContent);
    } else {
      this.writeToStdout(csvContent);
    }
  }

  onProgress(_state: ProgressState): void {
    // No-op for CSV reporter
  }

  onError(error: Error): void {
    console.error('CSV Reporter Error:', error.message);
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
        'ciProvider'
      );
    }

    return headers.map(h => this.escapeField(h)).join(this.delimiter);
  }

  /**
   * Generate a CSV row from a data row
   */
  private generateRow(row: CsvRow): string {
    const values = [
      row.file || '',
      row.suite || '',
      row.task || '',
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
        row.ciProvider || ''
      );
    }

    return values.map(v => this.escapeField(v)).join(this.delimiter);
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
        this.quote + this.quote
      );
      return this.quote + escaped + this.quote;
    }

    return value;
  }

  /**
   * Write CSV content to file
   */
  private async writeToFile(csvContent: string): Promise<void> {
    if (!this.outputPath) {
      throw new Error('Output path not specified');
    }

    try {
      // Ensure directory exists
      const dir = dirname(this.outputPath);
      mkdirSync(dir, { recursive: true });

      // Write CSV file
      writeFileSync(this.outputPath, csvContent, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to write CSV output to ${this.outputPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Write CSV content to stdout
   */
  private writeToStdout(csvContent: string): void {
    console.log(csvContent);
  }

  /**
   * Get the output path (if configured)
   */
  getOutputPath(): string | undefined {
    return this.outputPath;
  }

  /**
   * Check if headers are included
   */
  areHeadersIncluded(): boolean {
    return this.includeHeaders;
  }

  /**
   * Check if metadata is included
   */
  isMetadataIncluded(): boolean {
    return this.includeMetadata;
  }

  /**
   * Get the delimiter character
   */
  getDelimiter(): string {
    return this.delimiter;
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
}
