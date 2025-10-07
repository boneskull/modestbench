/**
 * ModestBench CLI Types
 *
 * Defines types specific to the command-line interface, including command definitions,
 * argument parsing, and CLI-specific configuration structures.
 */

/**
 * Exit codes used by the CLI
 */
export const ExitCodes = {
  Success: 0,
  GeneralError: 1,
  ConfigurationError: 2,
  FileDiscoveryError: 3,
  ValidationError: 4,
  ExecutionError: 5,
} as const;

export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes];

/**
 * Base command interface
 */
export interface CliCommand {
  /** Command name */
  readonly name: string;
  /** Command description */
  readonly description: string;
  /** Command aliases */
  readonly aliases?: string[];
  /** Execute the command */
  execute(args: CommandArguments): Promise<ExitCode>;
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
 * Arguments for the run command
 */
export interface RunCommandArgs extends CommandArguments {
  /** Pattern for discovering benchmark files */
  readonly pattern?: string;
  /** Configuration file path */
  readonly config?: string;
  readonly c?: string;
  /** Reporters to use */
  readonly reporters?: string | string[];
  readonly r?: string | string[];
  /** Output directory */
  readonly output?: string;
  readonly o?: string;
  /** Number of iterations */
  readonly iterations?: number;
  readonly i?: number;
  /** Time limit in milliseconds */
  readonly time?: number;
  readonly t?: number;
  /** Warmup iterations */
  readonly warmup?: number;
  readonly w?: number;
  /** Run concurrently */
  readonly concurrent?: boolean;
  /** Stop on first failure */
  readonly bail?: boolean;
  /** Files to exclude */
  readonly exclude?: string | string[];
  /** Timeout per task */
  readonly timeout?: number;
  /** Quiet output */
  readonly quiet?: boolean;
  readonly q?: boolean;
  /** Verbose output */
  readonly verbose?: boolean;
  readonly v?: boolean;
  /** Tags to include */
  readonly tags?: string | string[];
}

/**
 * Arguments for the init command
 */
export interface InitCommandArgs extends CommandArguments {
  /** Configuration file type */
  readonly configType?: 'json' | 'yaml' | 'js' | 'ts';
  /** Create example files */
  readonly examples?: boolean;
  /** Force overwrite existing files */
  readonly force?: boolean;
}

/**
 * Arguments for the validate command
 */
export interface ValidateCommandArgs extends CommandArguments {
  /** Configuration file to validate */
  readonly config?: string;
  /** Quiet output */
  readonly quiet?: boolean;
  /** Verbose output */
  readonly verbose?: boolean;
}

/**
 * Arguments for the history command
 */
export interface HistoryCommandArgs extends CommandArguments {
  /** History subcommand */
  readonly subcommand?: 'list' | 'show' | 'compare' | 'trends' | 'clean';
  /** Limit number of results */
  readonly limit?: number;
  readonly l?: number;
  /** Filter by date */
  readonly since?: string;
  /** Output format */
  readonly format?: 'table' | 'json' | 'csv';
  readonly f?: 'table' | 'json' | 'csv';
  /** Pattern to match */
  readonly pattern?: string;
  /** Tags to filter by */
  readonly tags?: string | string[];
  /** Run IDs for show/compare commands */
  readonly runIds?: string[];
}

/**
 * Global CLI options available to all commands
 */
export interface GlobalOptions {
  /** Help flag */
  readonly help?: boolean;
  readonly h?: boolean;
  /** Version flag */
  readonly version?: boolean;
  /** Working directory */
  readonly cwd?: string;
  /** Configuration file */
  readonly config?: string;
  readonly c?: string;
  /** Log level */
  readonly logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  /** No color output */
  readonly noColor?: boolean;
}

/**
 * CLI argument specification for a command
 */
export interface ArgumentSpec {
  /** Argument name */
  readonly name: string;
  /** Argument description */
  readonly description: string;
  /** Argument type */
  readonly type: 'string' | 'number' | 'boolean' | 'array';
  /** Whether argument is required */
  readonly required?: boolean;
  /** Default value */
  readonly default?: unknown;
  /** Short alias */
  readonly alias?: string;
  /** Choices for string arguments */
  readonly choices?: string[];
  /** Validation function */
  readonly validate?: (value: unknown) => boolean | string;
}

/**
 * CLI command specification
 */
export interface CommandSpec {
  /** Command name */
  readonly name: string;
  /** Command description */
  readonly description: string;
  /** Command aliases */
  readonly aliases?: string[];
  /** Positional arguments */
  readonly positional?: ArgumentSpec[];
  /** Named arguments */
  readonly options?: ArgumentSpec[];
  /** Examples of command usage */
  readonly examples?: string[];
  /** Subcommands */
  readonly subcommands?: CommandSpec[];
}

/**
 * CLI help information
 */
export interface HelpInfo {
  /** Command name */
  readonly command: string;
  /** Command description */
  readonly description: string;
  /** Usage string */
  readonly usage: string;
  /** Available options */
  readonly options: Array<{
    readonly flags: string;
    readonly description: string;
    readonly default?: string;
  }>;
  /** Examples */
  readonly examples?: string[];
  /** Available subcommands */
  readonly subcommands?: Array<{
    readonly name: string;
    readonly description: string;
  }>;
}

/**
 * CLI configuration
 */
export interface CliConfig {
  /** Application name */
  readonly name: string;
  /** Application version */
  readonly version: string;
  /** Application description */
  readonly description: string;
  /** Available commands */
  readonly commands: CommandSpec[];
  /** Global options */
  readonly globalOptions: ArgumentSpec[];
}

/**
 * CLI parser result
 */
export interface ParseResult {
  /** Parsed command name */
  readonly command: string;
  /** Parsed arguments */
  readonly args: CommandArguments;
  /** Whether help was requested */
  readonly help: boolean;
  /** Whether version was requested */
  readonly version: boolean;
  /** Parsing errors */
  readonly errors: string[];
}

/**
 * Progress display options
 */
export interface ProgressDisplayOptions {
  /** Show progress bars */
  readonly showProgress: boolean;
  /** Show current file being processed */
  readonly showCurrentFile: boolean;
  /** Show estimated time remaining */
  readonly showTimeRemaining: boolean;
  /** Update interval in milliseconds */
  readonly updateInterval: number;
  /** Progress bar width */
  readonly barWidth: number;
}

/**
 * Terminal capabilities
 */
export interface TerminalCapabilities {
  /** Terminal supports colors */
  readonly supportsColor: boolean;
  /** Terminal supports Unicode characters */
  readonly supportsUnicode: boolean;
  /** Terminal width in columns */
  readonly width: number;
  /** Terminal height in rows */
  readonly height: number;
  /** Terminal supports interactive features */
  readonly interactive: boolean;
}

/**
 * Color theme for CLI output
 */
export interface ColorTheme {
  /** Primary color for branding */
  readonly primary: string;
  /** Success color */
  readonly success: string;
  /** Warning color */
  readonly warning: string;
  /** Error color */
  readonly error: string;
  /** Info color */
  readonly info: string;
  /** Muted/secondary text color */
  readonly muted: string;
  /** Highlight color */
  readonly highlight: string;
}

/**
 * Output formatting options
 */
export interface OutputFormat {
  /** Use colors in output */
  readonly useColors: boolean;
  /** Use Unicode symbols */
  readonly useUnicode: boolean;
  /** Compact output mode */
  readonly compact: boolean;
  /** Color theme */
  readonly theme: ColorTheme;
  /** Progress display options */
  readonly progress: ProgressDisplayOptions;
}
