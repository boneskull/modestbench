/**
 * ModestBench Nyan Cat Reporter
 *
 * Because benchmarking should be more colorful. Displays an animated nyan cat
 * flying through a rainbow trail as benchmarks complete.
 *
 * Based on Mocha's legendary nyan reporter, adapted for the glory of
 * performance measurement.
 *
 * @packageDocumentation
 */

import type {
  BenchmarkRun,
  FileResult,
  SuiteResult,
  TaskResult,
} from '../types/index.js';

import { BaseReporter } from '../services/reporter-registry.js';
import { colors } from '../utils/ansi.js';

/**
 * Nyan Cat reporter - because your benchmarks deserve rainbow power
 */
export class NyanReporter extends BaseReporter {
  /** Index into rainbow colors for cycling */
  private colorIndex = 0;

  /** Current file being processed */
  private currentFile = '';

  /** Current suite being processed */
  private currentSuite = '';

  /** Total failed tasks */
  private failed = 0;

  /** Collected failures for summary */
  private failures: Array<{
    error: string;
    file: string;
    suite: string;
    task: string;
  }> = [];

  /** Number of lines the cat occupies */
  private readonly numberOfLines = 4;

  /** Total passed tasks */
  private passed = 0;

  /** Whether the display is active */
  private progressActive = false;

  /** Quiet mode - suppress output */
  private readonly quiet: boolean;

  /** Generated rainbow color palette */
  private rainbowColors: number[] = [];

  /** Width of scoreboard */
  private readonly scoreboardWidth = 5;

  /** Start time for duration calculation */
  private startTime = 0;

  /** Animation tick (alternates between frames) */
  private tick = false;

  /** Rainbow trail storage - one trajectory per cat line */
  private trajectories: string[][] = [[], [], [], []];

  /** Maximum width of the rainbow trail */
  private trajectoryWidthMax = 0;

  /** Whether to use colors */
  private readonly useColor: boolean;

  constructor(
    options: {
      color?: boolean;
      quiet?: boolean;
    } = {},
  ) {
    super('nyan', options);

    this.quiet = options.quiet ?? false;

    // Auto-detect color support if not explicitly set
    this.useColor =
      options.color ??
      (process.stdout.isTTY &&
        process.env.FORCE_COLOR !== '0' &&
        process.env.NO_COLOR == null);

    // Generate the rainbow colors on construction
    this.rainbowColors = this.generateColors();

    // Calculate trajectory width based on terminal width
    // Leave room for scoreboard (5) + cat (11) + some padding
    const termWidth = process.stdout.columns || 80;
    const nyanCatWidth = 11;
    this.trajectoryWidthMax = Math.floor(termWidth * 0.75) - nyanCatWidth;
  }

  onEnd(run: BenchmarkRun): void {
    if (this.quiet) {
      return;
    }

    // Show cursor and move past the cat
    this.showCursor();
    for (let i = 0; i < this.numberOfLines; i++) {
      process.stdout.write('\n');
    }

    // Print summary
    this.printEpilogue(run);
  }

  onError(error: Error): void {
    if (this.quiet) {
      return;
    }

    // Make sure cursor is visible
    this.showCursor();

    console.error(`\n${colors.red}Error: ${error.message}${colors.reset}`);
  }

  onFileEnd(_result: FileResult): void {
    // Just keep flying
  }

  onFileStart(file: string): void {
    this.currentFile = file;
  }

  onStart(_run: BenchmarkRun): void {
    this.startTime = Date.now();
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
    this.colorIndex = 0;
    this.tick = false;
    this.trajectories = [[], [], [], []];

    if (this.quiet) {
      return;
    }

    // Hide cursor for cleaner animation
    this.hideCursor();

    // Initial draw
    this.draw();
    this.progressActive = true;
  }

  onSuiteEnd(_result: SuiteResult): void {
    // Keep flying
  }

  onSuiteStart(suite: string): void {
    this.currentSuite = suite;
  }

  onTaskResult(result: TaskResult): void {
    if (result.error) {
      this.failed++;
      this.failures.push({
        error: result.error.message || String(result.error),
        file: this.currentFile,
        suite: this.currentSuite,
        task: result.name,
      });
    } else if (!result.aborted) {
      this.passed++;
    }

    if (this.quiet) {
      return;
    }

    this.draw();
  }

  onTaskStart(_task: string): void {
    // The cat flies on results, not starts
  }

  /**
   * Append a segment to the rainbow trail
   */
  private appendRainbow(): void {
    const segment = this.tick ? '_' : '-';
    const rainbowified = this.rainbowify(segment);

    for (let index = 0; index < this.numberOfLines; index++) {
      const trajectory = this.trajectories[index]!;
      if (trajectory.length >= this.trajectoryWidthMax) {
        trajectory.shift();
      }
      trajectory.push(rainbowified);
    }
  }

  /**
   * Move cursor down n lines
   */
  private cursorDown(n: number): void {
    process.stdout.write(`\x1b[${n}B`);
  }

  /**
   * Move cursor up n lines
   */
  private cursorUp(n: number): void {
    process.stdout.write(`\x1b[${n}A`);
  }

  /**
   * Draw the complete nyan cat scene
   */
  private draw(): void {
    this.appendRainbow();
    this.drawScoreboard();
    this.drawRainbow();
    this.drawNyanCat();
    this.tick = !this.tick;
  }

  /**
   * Draw the nyan cat ASCII art
   */
  private drawNyanCat(): void {
    const startWidth = this.scoreboardWidth + this.trajectories[0]!.length;
    const dist = `\x1b[${startWidth}C`;

    process.stdout.write(dist);
    process.stdout.write('_,------,');
    process.stdout.write('\n');

    process.stdout.write(dist);
    const padding1 = this.tick ? '  ' : '   ';
    process.stdout.write(`_|${padding1}/\\_/\\ `);
    process.stdout.write('\n');

    process.stdout.write(dist);
    const padding2 = this.tick ? '_' : '__';
    const tail = this.tick ? '~' : '^';
    process.stdout.write(`${tail}|${padding2}${this.face()} `);
    process.stdout.write('\n');

    process.stdout.write(dist);
    const padding3 = this.tick ? ' ' : '  ';
    process.stdout.write(`${padding3}""  "" `);
    process.stdout.write('\n');

    this.cursorUp(this.numberOfLines);
  }

  /**
   * Draw the rainbow trail
   */
  private drawRainbow(): void {
    for (const line of this.trajectories) {
      process.stdout.write(`\x1b[${this.scoreboardWidth}C`);
      process.stdout.write(line.join(''));
      process.stdout.write('\n');
    }

    this.cursorUp(this.numberOfLines);
  }

  /**
   * Draw the scoreboard showing pass/fail counts
   */
  private drawScoreboard(): void {
    const draw = (type: 'green' | 'red', n: number) => {
      process.stdout.write(' ');
      if (this.useColor) {
        process.stdout.write(`${colors[type]}${n}${colors.reset}`);
      } else {
        process.stdout.write(String(n));
      }
      process.stdout.write('\n');
    };

    draw('green', this.passed);
    draw('red', this.failed);
    process.stdout.write('\n');
    process.stdout.write('\n');

    this.cursorUp(this.numberOfLines);
  }

  /**
   * Get the nyan cat's face based on current state
   */
  private face(): string {
    if (this.failed > 0) {
      return '( x .x)';
    } else if (this.passed > 0) {
      return '( ^ .^)';
    }
    return '( - .-)';
  }

  /**
   * Generate rainbow colors using sine wave color cycling
   *
   * Uses 256-color palette (colors 16-231 are a 6x6x6 color cube)
   */
  private generateColors(): number[] {
    const colorList: number[] = [];

    // Generate 42 colors (6 * 7) cycling through the spectrum
    for (let i = 0; i < 6 * 7; i++) {
      const pi3 = Math.floor(Math.PI / 3);
      const n = i * (1.0 / 6);
      const r = Math.floor(3 * Math.sin(n) + 3);
      const g = Math.floor(3 * Math.sin(n + 2 * pi3) + 3);
      const b = Math.floor(3 * Math.sin(n + 4 * pi3) + 3);
      // Calculate 256-color code from RGB values (16 + 36*r + 6*g + b)
      colorList.push(36 * r + 6 * g + b + 16);
    }

    return colorList;
  }

  /**
   * Hide the cursor
   */
  private hideCursor(): void {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25l');
    }
  }

  /**
   * Print the epilogue summary after the run
   */
  private printEpilogue(run: BenchmarkRun): void {
    const duration = Date.now() - this.startTime;
    const durationStr = BaseReporter.formatDuration(duration * 1000000);

    console.log();
    console.log(
      `  ${this.useColor ? colors.green : ''}${this.passed} passing${this.useColor ? colors.reset : ''} ${this.useColor ? colors.gray : ''}(${durationStr})${this.useColor ? colors.reset : ''}`,
    );

    if (this.failed > 0) {
      console.log(
        `  ${this.useColor ? colors.red : ''}${this.failed} failing${this.useColor ? colors.reset : ''}`,
      );
      console.log();

      // Print failure details
      for (let i = 0; i < this.failures.length; i++) {
        const failure = this.failures[i]!;
        console.log(
          `  ${i + 1}) ${failure.suite === 'default' ? '' : failure.suite + ' > '}${failure.task}`,
        );
        console.log(
          `     ${this.useColor ? colors.red : ''}${failure.error}${this.useColor ? colors.reset : ''}`,
        );
        console.log();
      }
    }

    // Show total files/suites for context
    let totalSuites = 0;
    for (const file of run.files) {
      totalSuites += file.suites.length;
    }

    console.log();
    console.log(
      `  ${this.useColor ? colors.gray : ''}Files: ${run.files.length} | Suites: ${totalSuites} | Tasks: ${this.passed + this.failed}${this.useColor ? colors.reset : ''}`,
    );
  }

  /**
   * Apply rainbow coloring to a string
   */
  private rainbowify(str: string): string {
    if (!this.useColor) {
      return str;
    }

    const color =
      this.rainbowColors[this.colorIndex % this.rainbowColors.length]!;
    this.colorIndex += 1;

    return `\x1b[38;5;${color}m${str}\x1b[0m`;
  }

  /**
   * Show the cursor
   */
  private showCursor(): void {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25h');
    }
  }
}
