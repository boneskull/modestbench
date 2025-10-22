/**
 * ModestBench CLI Types
 *
 * Defines types specific to the command-line interface, including command
 * definitions, argument parsing, and CLI-specific configuration structures.
 */

/**
 * Exit codes used by the CLI
 */
export const ExitCodes = {
  ConfigurationError: 2,
  ExecutionError: 5,
  FileDiscoveryError: 3,
  GeneralError: 1,
  Success: 0,
  ValidationError: 4,
} as const;

/**
 * CLI argument specification for a command
 */
export interface ArgumentSpec {
  /** Short alias */
  readonly alias?: string;
  /** Choices for string arguments */
  readonly choices?: string[];
  /** Default value */
  readonly default?: unknown;
  /** Argument description */
  readonly description: string;
  /** Argument name */
  readonly name: string;
  /** Whether argument is required */
  readonly required?: boolean;
  /** Argument type */
  readonly type: 'array' | 'boolean' | 'number' | 'string';
  /** Validation function */
  readonly validate?: (value: unknown) => boolean | string;
}

/**
 * Base command interface
 */
export interface CliCommand {
  /** Command aliases */
  readonly aliases?: string[];
  /** Command description */
  readonly description: string;
  /** Execute the command */
  execute(args: CommandArguments): Promise<ExitCode>;
  /** Command name */
  readonly name: string;
}

/**
 * CLI configuration
 */
export interface CliConfig {
  /** Available commands */
  readonly commands: CommandSpec[];
  /** Application description */
  readonly description: string;
  /** Global options */
  readonly globalOptions: ArgumentSpec[];
  /** Application name */
  readonly name: string;
  /** Application version */
  readonly version: string;
}

/**
 * Color theme for CLI output
 */
export interface ColorTheme {
  /** Error color */
  readonly error: string;
  /** Highlight color */
  readonly highlight: string;
  /** Info color */
  readonly info: string;
  /** Muted/secondary text color */
  readonly muted: string;
  /** Primary color for branding */
  readonly primary: string;
  /** Success color */
  readonly success: string;
  /** Warning color */
  readonly warning: string;
}

/**
 * Parsed command-line arguments
 */
export interface CommandArguments {
  /** Positional arguments */
  readonly _: string[];
  /** Named arguments */
  readonly [key: string]: unknown;
}

/**
 * CLI command specification
 */
export interface CommandSpec {
  /** Command aliases */
  readonly aliases?: string[];
  /** Command description */
  readonly description: string;
  /** Examples of command usage */
  readonly examples?: string[];
  /** Command name */
  readonly name: string;
  /** Named arguments */
  readonly options?: ArgumentSpec[];
  /** Positional arguments */
  readonly positional?: ArgumentSpec[];
  /** Subcommands */
  readonly subcommands?: CommandSpec[];
}

export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes];

/**
 * Global CLI options available to all commands
 */
export interface GlobalOptions {
  readonly c?: string;
  /** Configuration file */
  readonly config?: string;
  /** Working directory */
  readonly cwd?: string;
  readonly h?: boolean;
  /** Help flag */
  readonly help?: boolean;
  /** Log level */
  readonly logLevel?: 'debug' | 'error' | 'info' | 'silent' | 'warn';
  /** No color output */
  readonly noColor?: boolean;
  /** Version flag */
  readonly version?: boolean;
}

/**
 * CLI help information
 */
export interface HelpInfo {
  /** Command name */
  readonly command: string;
  /** Command description */
  readonly description: string;
  /** Examples */
  readonly examples?: string[];
  /** Available options */
  readonly options: Array<{
    readonly default?: string;
    readonly description: string;
    readonly flags: string;
  }>;
  /** Available subcommands */
  readonly subcommands?: Array<{
    readonly description: string;
    readonly name: string;
  }>;
  /** Usage string */
  readonly usage: string;
}

/**
 * Arguments for the history command
 */
export interface HistoryCommandArgs extends CommandArguments {
  readonly f?: 'csv' | 'json' | 'table';
  /** Output format */
  readonly format?: 'csv' | 'json' | 'table';
  readonly l?: number;
  /** Limit number of results */
  readonly limit?: number;
  /** Pattern to match */
  readonly pattern?: string;
  /** Run IDs for show/compare commands */
  readonly runIds?: string[];
  /** Filter by date */
  readonly since?: string;
  /** History subcommand */
  readonly subcommand?: 'clean' | 'compare' | 'list' | 'show' | 'trends';
  /** Tags to filter by */
  readonly tags?: string | string[];
}

/**
 * Arguments for the init command
 */
export interface InitCommandArgs extends CommandArguments {
  /** Configuration file type */
  readonly configType?: 'js' | 'json' | 'ts' | 'yaml';
  /** Create example files */
  readonly examples?: boolean;
  /** Force overwrite existing files */
  readonly force?: boolean;
}

/**
 * Output formatting options
 */
export interface OutputFormat {
  /** Compact output mode */
  readonly compact: boolean;
  /** Progress display options */
  readonly progress: ProgressDisplayOptions;
  /** Color theme */
  readonly theme: ColorTheme;
  /** Use colors in output */
  readonly useColors: boolean;
  /** Use Unicode symbols */
  readonly useUnicode: boolean;
}

/**
 * CLI parser result
 */
export interface ParseResult {
  /** Parsed arguments */
  readonly args: CommandArguments;
  /** Parsed command name */
  readonly command: string;
  /** Parsing errors */
  readonly errors: string[];
  /** Whether help was requested */
  readonly help: boolean;
  /** Whether version was requested */
  readonly version: boolean;
}

/**
 * Progress display options
 */
export interface ProgressDisplayOptions {
  /** Progress bar width */
  readonly barWidth: number;
  /** Show current file being processed */
  readonly showCurrentFile: boolean;
  /** Show progress bars */
  readonly showProgress: boolean;
  /** Show estimated time remaining */
  readonly showTimeRemaining: boolean;
  /** Update interval in milliseconds */
  readonly updateInterval: number;
}

/**
 * Arguments for the run command
 */
export interface RunCommandArgs extends CommandArguments {
  /** Stop on first failure */
  readonly bail?: boolean;
  readonly c?: string;
  /** Configuration file path */
  readonly config?: string;
  readonly e?: 'accurate' | 'tinybench';
  /** Benchmark engine to use */
  readonly engine?: 'accurate' | 'tinybench';
  /** Files to exclude */
  readonly exclude?: string | string[];
  /** Tags to exclude */
  readonly excludeTags?: string | string[];
  readonly i?: number;
  /** Number of iterations */
  readonly iterations?: number;
  /** How to limit benchmark execution */
  readonly limitBy?: 'all' | 'any' | 'iterations' | 'time';
  readonly o?: string;
  /** Output directory */
  readonly output?: string;
  /** Pattern for discovering benchmark files */
  readonly pattern?: string;
  readonly q?: boolean;
  /** Quiet output */
  readonly quiet?: boolean;
  readonly r?: string | string[];
  /** Reporters to use */
  readonly reporters?: string | string[];
  readonly t?: number;
  /** Tags to include */
  readonly tags?: string | string[];
  /** Time limit in milliseconds */
  readonly time?: number;
  /** Timeout per task */
  readonly timeout?: number;
  readonly v?: boolean;
  /** Verbose output */
  readonly verbose?: boolean;
  readonly w?: number;
  /** Warmup iterations */
  readonly warmup?: number;
}

/**
 * Terminal capabilities
 */
export interface TerminalCapabilities {
  /** Terminal height in rows */
  readonly height: number;
  /** Terminal supports interactive features */
  readonly interactive: boolean;
  /** Terminal supports colors */
  readonly supportsColor: boolean;
  /** Terminal supports Unicode characters */
  readonly supportsUnicode: boolean;
  /** Terminal width in columns */
  readonly width: number;
}
