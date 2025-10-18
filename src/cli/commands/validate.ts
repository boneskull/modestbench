/**
 * ModestBench Validate Command
 *
 * Validate benchmark files and configurations without execution. Provides
 * detailed reporting of issues and suggestions for fixes.
 */

import type { ValidationResult } from '../../types/interfaces.js';
import type { CliContext } from '../index.js';

/**
 * Validate command options interface
 */
export interface ValidateOptions {
  config?: string | undefined;
  cwd: string;
  fix?: boolean | undefined;
  format: 'human' | 'json';
  pattern: string[];
  quiet?: boolean | undefined;
  strict?: boolean | undefined;
  verbose?: boolean | undefined;
}

/**
 * Enhanced validation result with detailed information
 */
interface DetailedValidationResult {
  file: string;
  fixable: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
  valid: boolean;
}

/**
 * Individual validation issue
 */
interface ValidationIssue {
  code: string;
  column?: number;
  context?: string;
  fixable?: boolean;
  line?: number;
  message: string;
  severity: ValidationSeverity;
}

/**
 * Validation issue severity levels
 */
type ValidationSeverity = 'error' | 'info' | 'warning';

/**
 * Validation statistics
 */
interface ValidationStats {
  errors: number;
  fixableIssues: number;
  infos: number;
  invalidFiles: number;
  totalFiles: number;
  validFiles: number;
  warnings: number;
}

/**
 * Handle validate command
 */
export const handleValidateCommand = async (
  context: CliContext,
  options: ValidateOptions,
): Promise<number> => {
  try {
    const { configManager, engine } = context;

    // Load and merge configuration - handle gracefully for validation
    let config;
    try {
      config = await configManager.load(options.config);
    } catch (configError) {
      // If specific config file was requested and failed, that's a config error
      if (options.config) {
        if (options.format === 'json') {
          console.log(
            JSON.stringify(
              {
                error: `Configuration error: ${configError instanceof Error ? configError.message : String(configError)}`,
                results: [],
                stats: createEmptyStats(),
                success: false,
              },
              null,
              2,
            ),
          );
        } else {
          console.error(
            'Configuration error:',
            configError instanceof Error
              ? configError.message
              : String(configError),
          );
        }
        return 2; // Configuration errors
      }

      // If no config file specified, use defaults for validation
      config = { pattern: '**/*.bench.{js,ts,mjs}' };
    }

    const patterns =
      options.pattern.length > 0 ? options.pattern : [config.pattern];

    if (!options.quiet) {
      console.log('Validating benchmark files...');
      if (options.verbose) {
        console.log(`Patterns: ${patterns.join(', ')}`);
        console.log(`Strict mode: ${options.strict ? 'enabled' : 'disabled'}`);
        console.log(`Auto-fix: ${options.fix ? 'enabled' : 'disabled'}`);
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
      if (options.format === 'json') {
        console.log(
          JSON.stringify(
            {
              message: 'No benchmark files found',
              results: [],
              stats: createEmptyStats(),
              success: false,
            },
            null,
            2,
          ),
        );
      } else {
        console.log(
          '❌ No benchmark files found matching the specified patterns.',
        );
        console.log('');
        console.log('Patterns searched:');
        patterns.forEach((pattern: string) => console.log(`  - ${pattern}`));
      }
      return 3; // Discovery error
    }

    if (options.verbose) {
      console.log(`Found ${files.length} benchmark file(s):`);
      files.forEach((file) => console.log(`  - ${file}`));
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
          options,
        );
        validationResults.push(detailedResult);

        // Check for errors (or warnings in strict mode)
        const criticalIssues = detailedResult.issues.filter(
          (issue) =>
            issue.severity === 'error' ||
            (options.strict && issue.severity === 'warning'),
        );

        if (criticalIssues.length > 0) {
          hasErrors = true;
        }
      } catch (error) {
        // Create error result for files that fail to validate
        const errorResult: DetailedValidationResult = {
          file,
          fixable: false,
          issues: [
            {
              code: 'VALIDATION_FAILED',
              fixable: false,
              message: error instanceof Error ? error.message : String(error),
              severity: 'error',
            },
          ],
          suggestions: ['Check file syntax and structure'],
          valid: false,
        };
        validationResults.push(errorResult);
        hasErrors = true;
      }
    }

    // Apply auto-fixes if requested
    if (options.fix) {
      const fixResults = await applyAutoFixes(validationResults, options);
      if (!options.quiet && fixResults.fixed > 0) {
        console.log(
          `✅ Auto-fixed ${fixResults.fixed} issue(s) in ${fixResults.files} file(s)`,
        );
        console.log();
      }
    }

    // Generate output
    const stats = calculateStats(validationResults);

    if (options.format === 'json') {
      const output = {
        config: {
          autoFix: options.fix,
          patterns,
          strict: options.strict,
        },
        results: validationResults,
        stats,
        success: !hasErrors,
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      await displayHumanOutput(validationResults, stats, options);
    }

    // Return appropriate exit code
    if (hasErrors) {
      return 1; // Validation failures
    } else if (stats.warnings > 0 && !options.quiet) {
      console.log('⚠️  Validation completed with warnings.');
      return 0;
    } else {
      if (!options.quiet) {
        console.log('✅ All benchmark files validated successfully!');
      }
      return 0;
    }
  } catch (error) {
    if (options.format === 'json') {
      console.log(
        JSON.stringify(
          {
            error: error instanceof Error ? error.message : String(error),
            results: [],
            stats: createEmptyStats(),
            success: false,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(
        'Validation failed:',
        error instanceof Error ? error.message : String(error),
      );

      if (options.verbose && error instanceof Error && error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
      }
    }

    return 2; // Configuration/runtime errors
  }
};

/**
 * Apply automatic fixes to validation issues
 */
const applyAutoFixes = async (
  results: DetailedValidationResult[],
  options: ValidateOptions,
): Promise<{ files: number; fixed: number }> => {
  let totalFixed = 0;
  let filesFixed = 0;

  for (const result of results) {
    if (!result.fixable) {
      continue;
    }

    const fixableIssues = result.issues.filter((issue) => issue.fixable);
    if (fixableIssues.length === 0) {
      continue;
    }

    try {
      const fixes = await applyFileFixes(result.file, fixableIssues, options);
      if (fixes > 0) {
        totalFixed += fixes;
        filesFixed++;

        // Mark issues as fixed
        fixableIssues.forEach((issue) => {
          issue.message = `${issue.message} (auto-fixed)`;
          issue.severity = 'info';
        });
      }
    } catch (error) {
      if (options.verbose) {
        console.warn(
          `Could not auto-fix ${result.file}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return { files: filesFixed, fixed: totalFixed };
};

/**
 * Apply fixes to a specific file
 */
const applyFileFixes = async (
  file: string,
  issues: ValidationIssue[],
  _options: ValidateOptions,
): Promise<number> => {
  const { readFile, writeFile } = await import('node:fs/promises');
  let content = await readFile(file, 'utf8');
  let fixesApplied = 0;

  for (const issue of issues) {
    switch (issue.code) {
      case 'CONSOLE_IN_BENCHMARK': {
        // Remove console.log statements
        const consoleBefore =
          content.match(/console\.log\([^)]*\);?/g)?.length || 0;
        content = content.replace(/console\.log\([^)]*\);?/g, '');
        const consoleAfter =
          content.match(/console\.log\([^)]*\);?/g)?.length || 0;
        fixesApplied += consoleBefore - consoleAfter;
        break;
      }

      case 'MISSING_NAME': {
        // Add a basic name property
        if (!content.includes('name:')) {
          content = content.replace(
            /export default \{/,
            `export default {\n  name: 'Benchmark Suite',`,
          );
          fixesApplied++;
        }
        break;
      }

      default:
        // Issue not auto-fixable
        break;
    }
  }

  if (fixesApplied > 0) {
    await writeFile(file, content, 'utf8');
  }

  return fixesApplied;
};

/**
 * Calculate validation statistics
 */
const calculateStats = (
  results: DetailedValidationResult[],
): ValidationStats => {
  const stats: ValidationStats = {
    errors: 0,
    fixableIssues: 0,
    infos: 0,
    invalidFiles: 0,
    totalFiles: results.length,
    validFiles: 0,
    warnings: 0,
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
        case 'info':
          stats.infos++;
          break;
        case 'warning':
          stats.warnings++;
          break;
      }

      if (issue.fixable) {
        stats.fixableIssues++;
      }
    }
  }

  return stats;
};

/**
 * Create empty statistics object
 */
const createEmptyStats = (): ValidationStats => {
  return {
    errors: 0,
    fixableIssues: 0,
    infos: 0,
    invalidFiles: 0,
    totalFiles: 0,
    validFiles: 0,
    warnings: 0,
  };
};

/**
 * Display human-readable validation output
 */
const displayHumanOutput = async (
  results: DetailedValidationResult[],
  stats: ValidationStats,
  options: ValidateOptions,
): Promise<void> => {
  console.log('📋 Validation Results');
  console.log('═'.repeat(50));
  console.log();

  // Display stats overview
  console.log(
    `📊 Summary: ${stats.validFiles}/${stats.totalFiles} files valid`,
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
          info: 'ℹ️ ',
          warning: '⚠️ ',
        }[issue.severity];

        const fixableIndicator = issue.fixable ? ' [fixable]' : '';
        console.log(`   ${severityIcon} ${issue.message}${fixableIndicator}`);

        if (issue.context && options.verbose) {
          console.log(`      Context: ${issue.context}`);
        }
      }
    }

    if (result.suggestions.length > 0 && options.verbose) {
      console.log('   💡 Suggestions:');
      for (const suggestion of result.suggestions) {
        console.log(`      - ${suggestion}`);
      }
    }

    console.log();
  }

  // Display recommendations
  if (stats.fixableIssues > 0 && !options.fix) {
    console.log('💡 Run with --fix to automatically resolve fixable issues');
    console.log();
  }

  if (stats.warnings > 0 && !options.strict) {
    console.log('💡 Run with --strict to treat warnings as errors');
    console.log();
  }
};

/**
 * Enhance basic validation result with detailed analysis
 */
const enhanceValidationResult = async (
  file: string,
  basicResult: ValidationResult,
  options: ValidateOptions,
): Promise<DetailedValidationResult> => {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  let fixable = false;

  // Convert basic validation errors to detailed issues
  if (!basicResult.valid && basicResult.errors) {
    for (const error of basicResult.errors) {
      const issueData: ValidationIssue = {
        code: error.code,
        fixable: false,
        message: error.message,
        severity: 'error',
      };
      if (error.line !== undefined) {
        issueData.line = error.line;
      }
      if (error.column !== undefined) {
        issueData.column = error.column;
      }
      issues.push(issueData);
    }
  }

  // Add additional static analysis (basic implementation)
  try {
    const additionalIssues = await performStaticAnalysis(file, options);
    issues.push(...additionalIssues.issues);
    suggestions.push(...additionalIssues.suggestions);
    if (additionalIssues.fixable) {
      fixable = true;
    }
  } catch {
    // Static analysis failed, add warning
    issues.push({
      code: 'STATIC_ANALYSIS_FAILED',
      fixable: false,
      message: 'Could not perform static analysis on file',
      severity: 'warning',
    });
  }

  return {
    file,
    fixable,
    issues,
    suggestions,
    valid:
      basicResult.valid &&
      issues.filter((i) => i.severity === 'error').length === 0,
  };
};

/**
 * Perform static analysis on benchmark file
 */
const performStaticAnalysis = async (
  file: string,
  _options: ValidateOptions,
): Promise<{
  fixable: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}> => {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  let fixable = false;

  try {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(file, 'utf8');

    // Check for export default
    if (!content.includes('export default')) {
      issues.push({
        code: 'MISSING_EXPORT',
        fixable: false,
        message: 'Benchmark file must have a default export',
        severity: 'error',
      });
      suggestions.push(
        'Add "export default { ... }" to define your benchmark suite',
      );
    }

    // Check for benchmark structure
    if (!content.includes('benchmarks:') && !content.includes('benchmarks ')) {
      issues.push({
        code: 'MISSING_BENCHMARKS',
        fixable: false,
        message: 'No benchmarks property found',
        severity: 'error',
      });
      suggestions.push(
        'Add a "benchmarks" object with your benchmark functions',
      );
    }

    // Check for async/await usage without proper handling
    if (content.includes('await ') && !content.includes('async ')) {
      issues.push({
        code: 'ASYNC_WITHOUT_DECLARATION',
        fixable: true,
        message: 'Found await without async function declaration',
        severity: 'warning',
      });
      fixable = true;
    }

    // Check for console.log in benchmark functions (performance impact)
    if (content.includes('console.log')) {
      issues.push({
        code: 'CONSOLE_IN_BENCHMARK',
        fixable: true,
        message:
          'Console logging in benchmarks can affect performance measurements',
        severity: 'warning',
      });
      suggestions.push(
        'Remove console.log statements from benchmark functions',
      );
      fixable = true;
    }

    // Check for very short function names (readability)
    const shortNameRegex = /['"]([a-z]{1,2})['"]\\s*:/gi;
    const shortNames = content.match(shortNameRegex);
    if (shortNames && shortNames.length > 0) {
      issues.push({
        code: 'SHORT_BENCHMARK_NAMES',
        fixable: false,
        message: 'Consider using more descriptive benchmark names',
        severity: 'info',
      });
      suggestions.push(
        'Use descriptive names for better result interpretation',
      );
    }

    // Check for missing name property
    if (!content.includes('name:') && !content.includes('name ')) {
      issues.push({
        code: 'MISSING_NAME',
        fixable: true,
        message: 'Benchmark suite should have a descriptive name',
        severity: 'warning',
      });
      suggestions.push(
        'Add a "name" property to describe your benchmark suite',
      );
      fixable = true;
    }
  } catch (error) {
    issues.push({
      code: 'FILE_READ_ERROR',
      fixable: false,
      message: `Could not read file: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error',
    });
  }

  return { fixable, issues, suggestions };
};
