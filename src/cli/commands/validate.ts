/**
 * ModestBench Validate Command
 *
 * Validate benchmark files and configurations without execution.
 * Provides detailed reporting of issues and suggestions for fixes.
 */

import type { CliContext } from '../index.js';
import type { ValidationResult } from '../../types/interfaces.js';

/**
 * Validate command arguments interface
 */
interface ValidateArguments {
  pattern: string[];
  fix?: boolean;
  strict?: boolean;
  format: 'human' | 'json';
  cwd: string;
  quiet?: boolean;
  verbose?: boolean;
  config?: string;
}

/**
 * Validation issue severity levels
 */
type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Enhanced validation result with detailed information
 */
interface DetailedValidationResult {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
  fixable: boolean;
}

/**
 * Individual validation issue
 */
interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  line?: number;
  column?: number;
  context?: string;
  fixable?: boolean;
}

/**
 * Validation statistics
 */
interface ValidationStats {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  errors: number;
  warnings: number;
  infos: number;
  fixableIssues: number;
}

export const validateCommand = {
  builder: (yargs: any) => {
    return yargs
      .option('fix', {
        type: 'boolean',
        description: 'Automatically fix issues where possible',
        default: false,
      })
      .option('strict', {
        type: 'boolean',
        description: 'Enable strict validation (treat warnings as errors)',
        default: false,
      })
      .option('format', {
        type: 'string',
        description: 'Output format',
        choices: ['human', 'json'],
        default: 'human',
      })
      .option('quiet', {
        type: 'boolean',
        description: 'Minimal output',
        default: false,
      })
      .option('verbose', {
        type: 'boolean',
        description: 'Detailed output',
        default: false,
      })
      .example([
        ['$0 validate', 'Validate all benchmark files'],
        ['$0 validate "benchmarks/*.bench.js"', 'Validate specific patterns'],
        [
          '$0 validate --strict --format json',
          'Strict validation with JSON output',
        ],
        ['$0 validate --fix', 'Validate and auto-fix issues'],
      ]);
  },

  handler: async (
    context: CliContext,
    argv: ValidateArguments
  ): Promise<number> => {
    try {
      const { configManager, engine } = context;

      // Load and merge configuration - handle gracefully for validation
      let config;
      try {
        config = await configManager.load(argv.config);
      } catch (configError) {
        // If specific config file was requested and failed, that's a config error
        if (argv.config) {
          if (argv.format === 'json') {
            console.log(
              JSON.stringify(
                {
                  success: false,
                  error: `Configuration error: ${configError instanceof Error ? configError.message : String(configError)}`,
                  stats: createEmptyStats(),
                  results: [],
                },
                null,
                2
              )
            );
          } else {
            console.error(
              'Configuration error:',
              configError instanceof Error
                ? configError.message
                : String(configError)
            );
          }
          return 2; // Configuration errors
        }

        // If no config file specified, use defaults for validation
        config = { pattern: '**/*.bench.{js,ts,mjs}' };
      }

      const patterns =
        argv.pattern.length > 0 ? argv.pattern : [config.pattern];

      if (!argv.quiet) {
        console.log('Validating benchmark files...');
        if (argv.verbose) {
          console.log(`Patterns: ${patterns.join(', ')}`);
          console.log(`Strict mode: ${argv.strict ? 'enabled' : 'disabled'}`);
          console.log(`Auto-fix: ${argv.fix ? 'enabled' : 'disabled'}`);
        }
        console.log();
      }

      // Discover benchmark files
      let files: string[] = [];
      for (const pattern of patterns) {
        const patternFiles = await engine.discover(pattern);
        files.push(...patternFiles);
      }
      // Remove duplicates
      files = [...new Set(files)];

      if (files.length === 0) {
        if (argv.format === 'json') {
          console.log(
            JSON.stringify(
              {
                success: false,
                message: 'No benchmark files found',
                stats: createEmptyStats(),
                results: [],
              },
              null,
              2
            )
          );
        } else {
          console.log(
            '❌ No benchmark files found matching the specified patterns.'
          );
          console.log('');
          console.log('Patterns searched:');
          patterns.forEach((pattern: string) => console.log(`  - ${pattern}`));
        }
        return 3; // Discovery error
      }

      if (argv.verbose) {
        console.log(`Found ${files.length} benchmark file(s):`);
        files.forEach(file => console.log(`  - ${file}`));
        console.log();
      }

      // Validate each file
      const validationResults: DetailedValidationResult[] = [];
      let hasErrors = false;

      for (const file of files) {
        try {
          const basicResult = await engine.validate([file]);
          const detailedResult = await enhanceValidationResult(
            file,
            basicResult,
            argv
          );
          validationResults.push(detailedResult);

          // Check for errors (or warnings in strict mode)
          const criticalIssues = detailedResult.issues.filter(
            issue =>
              issue.severity === 'error' ||
              (argv.strict && issue.severity === 'warning')
          );

          if (criticalIssues.length > 0) {
            hasErrors = true;
          }
        } catch (error) {
          // Create error result for files that fail to validate
          const errorResult: DetailedValidationResult = {
            file,
            valid: false,
            issues: [
              {
                severity: 'error',
                code: 'VALIDATION_FAILED',
                message: error instanceof Error ? error.message : String(error),
                fixable: false,
              },
            ],
            suggestions: ['Check file syntax and structure'],
            fixable: false,
          };
          validationResults.push(errorResult);
          hasErrors = true;
        }
      }

      // Apply auto-fixes if requested
      if (argv.fix) {
        const fixResults = await applyAutoFixes(validationResults, argv);
        if (!argv.quiet && fixResults.fixed > 0) {
          console.log(
            `✅ Auto-fixed ${fixResults.fixed} issue(s) in ${fixResults.files} file(s)`
          );
          console.log();
        }
      }

      // Generate output
      const stats = calculateStats(validationResults);

      if (argv.format === 'json') {
        const output = {
          success: !hasErrors,
          stats,
          results: validationResults,
          config: {
            strict: argv.strict,
            autoFix: argv.fix,
            patterns,
          },
        };
        console.log(JSON.stringify(output, null, 2));
      } else {
        await displayHumanOutput(validationResults, stats, argv);
      }

      // Return appropriate exit code
      if (hasErrors) {
        return 1; // Validation failures
      } else if (stats.warnings > 0 && !argv.quiet) {
        console.log('⚠️  Validation completed with warnings.');
        return 0;
      } else {
        if (!argv.quiet) {
          console.log('✅ All benchmark files validated successfully!');
        }
        return 0;
      }
    } catch (error) {
      if (argv.format === 'json') {
        console.log(
          JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              stats: createEmptyStats(),
              results: [],
            },
            null,
            2
          )
        );
      } else {
        console.error(
          'Validation failed:',
          error instanceof Error ? error.message : String(error)
        );

        if (argv.verbose && error instanceof Error && error.stack) {
          console.error('Stack trace:');
          console.error(error.stack);
        }
      }

      return 2; // Configuration/runtime errors
    }
  },
};

/**
 * Enhance basic validation result with detailed analysis
 */
async function enhanceValidationResult(
  file: string,
  basicResult: ValidationResult,
  argv: ValidateArguments
): Promise<DetailedValidationResult> {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  let fixable = false;

  // Convert basic validation errors to detailed issues
  if (!basicResult.valid && basicResult.errors) {
    for (const error of basicResult.errors) {
      const issueData: ValidationIssue = {
        severity: 'error',
        code: error.code,
        message: error.message,
        fixable: false,
      };
      if (error.line !== undefined) issueData.line = error.line;
      if (error.column !== undefined) issueData.column = error.column;
      issues.push(issueData);
    }
  }

  // Add additional static analysis (basic implementation)
  try {
    const additionalIssues = await performStaticAnalysis(file, argv);
    issues.push(...additionalIssues.issues);
    suggestions.push(...additionalIssues.suggestions);
    if (additionalIssues.fixable) {
      fixable = true;
    }
  } catch {
    // Static analysis failed, add warning
    issues.push({
      severity: 'warning',
      code: 'STATIC_ANALYSIS_FAILED',
      message: 'Could not perform static analysis on file',
      fixable: false,
    });
  }

  return {
    file,
    valid:
      basicResult.valid &&
      issues.filter(i => i.severity === 'error').length === 0,
    issues,
    suggestions,
    fixable,
  };
}

/**
 * Perform static analysis on benchmark file
 */
async function performStaticAnalysis(
  file: string,
  argv: ValidateArguments
): Promise<{
  issues: ValidationIssue[];
  suggestions: string[];
  fixable: boolean;
}> {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  let fixable = false;

  try {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(file, 'utf8');

    // Check for common issues
    const lines = content.split('\n');

    // Check for export default
    if (!content.includes('export default')) {
      issues.push({
        severity: 'error',
        code: 'MISSING_EXPORT',
        message: 'Benchmark file must have a default export',
        fixable: false,
      });
      suggestions.push(
        'Add "export default { ... }" to define your benchmark suite'
      );
    }

    // Check for benchmark structure
    if (!content.includes('benchmarks:') && !content.includes('benchmarks ')) {
      issues.push({
        severity: 'error',
        code: 'MISSING_BENCHMARKS',
        message: 'No benchmarks property found',
        fixable: false,
      });
      suggestions.push(
        'Add a "benchmarks" object with your benchmark functions'
      );
    }

    // Check for async/await usage without proper handling
    if (content.includes('await ') && !content.includes('async ')) {
      issues.push({
        severity: 'warning',
        code: 'ASYNC_WITHOUT_DECLARATION',
        message: 'Found await without async function declaration',
        fixable: true,
      });
      fixable = true;
    }

    // Check for console.log in benchmark functions (performance impact)
    if (content.includes('console.log')) {
      issues.push({
        severity: 'warning',
        code: 'CONSOLE_IN_BENCHMARK',
        message:
          'Console logging in benchmarks can affect performance measurements',
        fixable: true,
      });
      suggestions.push(
        'Remove console.log statements from benchmark functions'
      );
      fixable = true;
    }

    // Check for very short function names (readability)
    const shortNameRegex = /['"]([a-z]{1,2})['"]\\s*:/gi;
    const shortNames = content.match(shortNameRegex);
    if (shortNames && shortNames.length > 0) {
      issues.push({
        severity: 'info',
        code: 'SHORT_BENCHMARK_NAMES',
        message: 'Consider using more descriptive benchmark names',
        fixable: false,
      });
      suggestions.push(
        'Use descriptive names for better result interpretation'
      );
    }

    // Check for missing name property
    if (!content.includes('name:') && !content.includes('name ')) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_NAME',
        message: 'Benchmark suite should have a descriptive name',
        fixable: true,
      });
      suggestions.push(
        'Add a "name" property to describe your benchmark suite'
      );
      fixable = true;
    }
  } catch (error) {
    issues.push({
      severity: 'error',
      code: 'FILE_READ_ERROR',
      message: `Could not read file: ${error instanceof Error ? error.message : String(error)}`,
      fixable: false,
    });
  }

  return { issues, suggestions, fixable };
}

/**
 * Apply automatic fixes to validation issues
 */
async function applyAutoFixes(
  results: DetailedValidationResult[],
  argv: ValidateArguments
): Promise<{ fixed: number; files: number }> {
  let totalFixed = 0;
  let filesFixed = 0;

  for (const result of results) {
    if (!result.fixable) continue;

    const fixableIssues = result.issues.filter(issue => issue.fixable);
    if (fixableIssues.length === 0) continue;

    try {
      const fixes = await applyFileFixes(result.file, fixableIssues, argv);
      if (fixes > 0) {
        totalFixed += fixes;
        filesFixed++;

        // Mark issues as fixed
        fixableIssues.forEach(issue => {
          issue.message = `${issue.message} (auto-fixed)`;
          issue.severity = 'info';
        });
      }
    } catch (error) {
      if (argv.verbose) {
        console.warn(
          `Could not auto-fix ${result.file}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  return { fixed: totalFixed, files: filesFixed };
}

/**
 * Apply fixes to a specific file
 */
async function applyFileFixes(
  file: string,
  issues: ValidationIssue[],
  argv: ValidateArguments
): Promise<number> {
  const { readFile, writeFile } = await import('node:fs/promises');
  let content = await readFile(file, 'utf8');
  let fixesApplied = 0;

  for (const issue of issues) {
    switch (issue.code) {
      case 'CONSOLE_IN_BENCHMARK':
        // Remove console.log statements
        const consoleBefore =
          content.match(/console\.log\([^)]*\);?/g)?.length || 0;
        content = content.replace(/console\.log\([^)]*\);?/g, '');
        const consoleAfter =
          content.match(/console\.log\([^)]*\);?/g)?.length || 0;
        fixesApplied += consoleBefore - consoleAfter;
        break;

      case 'MISSING_NAME':
        // Add a basic name property
        if (!content.includes('name:')) {
          content = content.replace(
            /export default \{/,
            `export default {\n  name: 'Benchmark Suite',`
          );
          fixesApplied++;
        }
        break;

      default:
        // Issue not auto-fixable
        break;
    }
  }

  if (fixesApplied > 0) {
    await writeFile(file, content, 'utf8');
  }

  return fixesApplied;
}

/**
 * Calculate validation statistics
 */
function calculateStats(results: DetailedValidationResult[]): ValidationStats {
  const stats: ValidationStats = {
    totalFiles: results.length,
    validFiles: 0,
    invalidFiles: 0,
    errors: 0,
    warnings: 0,
    infos: 0,
    fixableIssues: 0,
  };

  for (const result of results) {
    if (result.valid) {
      stats.validFiles++;
    } else {
      stats.invalidFiles++;
    }

    for (const issue of result.issues) {
      switch (issue.severity) {
        case 'error':
          stats.errors++;
          break;
        case 'warning':
          stats.warnings++;
          break;
        case 'info':
          stats.infos++;
          break;
      }

      if (issue.fixable) {
        stats.fixableIssues++;
      }
    }
  }

  return stats;
}

/**
 * Display human-readable validation output
 */
async function displayHumanOutput(
  results: DetailedValidationResult[],
  stats: ValidationStats,
  argv: ValidateArguments
): Promise<void> {
  console.log('📋 Validation Results');
  console.log('═'.repeat(50));
  console.log();

  // Display stats overview
  console.log(
    `📊 Summary: ${stats.validFiles}/${stats.totalFiles} files valid`
  );
  if (stats.errors > 0) {
    console.log(`❌ Errors: ${stats.errors}`);
  }
  if (stats.warnings > 0) {
    console.log(`⚠️  Warnings: ${stats.warnings}`);
  }
  if (stats.infos > 0) {
    console.log(`ℹ️  Info: ${stats.infos}`);
  }
  if (stats.fixableIssues > 0) {
    console.log(`🔧 Fixable: ${stats.fixableIssues} issue(s)`);
  }
  console.log();

  // Display detailed results
  for (const result of results) {
    const statusIcon = result.valid ? '✅' : '❌';
    console.log(`${statusIcon} ${result.file}`);

    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        const severityIcon = {
          error: '❌',
          warning: '⚠️ ',
          info: 'ℹ️ ',
        }[issue.severity];

        const fixableIndicator = issue.fixable ? ' [fixable]' : '';
        console.log(`   ${severityIcon} ${issue.message}${fixableIndicator}`);

        if (issue.context && argv.verbose) {
          console.log(`      Context: ${issue.context}`);
        }
      }
    }

    if (result.suggestions.length > 0 && argv.verbose) {
      console.log('   💡 Suggestions:');
      for (const suggestion of result.suggestions) {
        console.log(`      - ${suggestion}`);
      }
    }

    console.log();
  }

  // Display recommendations
  if (stats.fixableIssues > 0 && !argv.fix) {
    console.log('💡 Run with --fix to automatically resolve fixable issues');
    console.log();
  }

  if (stats.warnings > 0 && !argv.strict) {
    console.log('💡 Run with --strict to treat warnings as errors');
    console.log();
  }
}

/**
 * Create empty statistics object
 */
function createEmptyStats(): ValidationStats {
  return {
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    errors: 0,
    warnings: 0,
    infos: 0,
    fixableIssues: 0,
  };
}
