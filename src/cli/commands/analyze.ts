/**
 * Analyze Command
 *
 * CLI command for analyzing code execution and identifying benchmark
 * candidates. Uses Node.js V8 profiler to capture function execution data.
 *
 * @packageDocumentation
 */

import type { ProfileConfig } from '../../types/profiler.js';
import type { CliContext } from '../index.js';

import { ProfileHumanReporter } from '../../reporters/profile-human.js';
import { filterProfile } from '../../services/profiler/profile-filter.js';
import { parseProfile } from '../../services/profiler/profile-parser.js';
import { runWithProfiling } from '../../services/profiler/profile-runner.js';
import { findPackageRoot } from '../../utils/package.js';

/**
 * Analyze command options interface
 */
export interface AnalyzeOptions {
  /** Enable color output */
  color?: boolean | undefined;

  /** Command to analyze */
  command?: string | undefined;

  /** Working directory */
  cwd: string;

  /** Filter by file pattern */
  filterFile?: string | undefined;

  /** Group by file */
  groupByFile?: boolean | undefined;

  /** Input profile file */
  input?: string | undefined;

  /** Minimum execution percentage */
  minPercent?: number | undefined;

  /** Number of top functions to show */
  top?: number | undefined;
}

/**
 * Handle analyze command
 */
export const handleAnalyzeCommand = async (
  _context: CliContext,
  options: AnalyzeOptions,
): Promise<number> => {
  try {
    const startTime = Date.now();

    // Run profiling or load existing profile
    const logPath = options.input
      ? options.input
      : await runWithProfiling(options.command!, {
          cwd: options.cwd,
        });

    const duration = Date.now() - startTime;

    // Parse profile data
    const profileData = await parseProfile(logPath);

    // Find package root for smart detection
    const packageRoot = await findPackageRoot(options.cwd);

    // Apply filtering
    const config: ProfileConfig = {
      focus: options.filterFile ? [options.filterFile] : undefined,
      groupByFile: options.groupByFile,
      minExecutionPercent: options.minPercent,
      smartDetection: true,
      topN: options.top,
    };

    const filtered = filterProfile(profileData, config, packageRoot);

    // Add command and duration to filtered data
    filtered.command = options.command;
    filtered.duration = duration;

    // Report results
    const reporter = new ProfileHumanReporter({
      color: options.color,
      groupByFile: options.groupByFile,
    });

    reporter.report(filtered);

    return 0;
  } catch (error) {
    console.error('Analyze command failed:', error);
    return 1;
  }
};
