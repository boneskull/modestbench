/**
 * ModestBench Reporter Loader
 *
 * Service for loading third-party reporter plugins from file paths or npm
 * packages. Supports multiple export patterns: plain objects, classes, and
 * factory functions (sync or async).
 */

import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Logger, Reporter, ReporterContext } from '../types/index.js';

import { Reporters } from '../constants.js';
import {
  ReporterLoadError,
  ReporterValidationError,
} from '../errors/reporter.js';
import { getPackageVersion } from '../utils/package.js';
import { reporterUtils } from '../utils/reporter-utils.js';

/**
 * Current plugin API version
 *
 * Increment this when making breaking changes to the plugin API.
 */
export const PLUGIN_API_VERSION = 1;

/**
 * Set of built-in reporter names
 */
const BUILT_IN_REPORTERS = new Set(Object.values(Reporters));

/**
 * Required methods that all reporters must implement
 */
const REQUIRED_REPORTER_METHODS = [
  'onStart',
  'onEnd',
  'onError',
  'onTaskResult',
] as const;

/**
 * Default logger implementation using console
 *
 * This provides a simple console-based logger for reporter plugins.
 */
const defaultLogger: Logger = {
  debug: (message, ...args) => console.debug(message, ...args),
  error: (message, ...args) => console.error(message, ...args),
  info: (message, ...args) => console.info(message, ...args),
  trace: (message, ...args) => console.trace(message, ...args),
  warn: (message, ...args) => console.warn(message, ...args),
};

/**
 * Create a ReporterContext for passing to plugins
 *
 * @param logger - Optional logger to use (defaults to console-based logger)
 * @returns ReporterContext with version info and utilities
 */
export const createReporterContext = (logger?: Logger): ReporterContext => {
  return {
    logger: logger ?? defaultLogger,
    pluginApiVersion: PLUGIN_API_VERSION,
    utils: reporterUtils,
    version: getPackageVersion(),
  };
};

/**
 * Get the list of missing required methods from a reporter object
 *
 * @param obj - Object to check
 * @returns Array of missing method names
 */
const getMissingMethods = (obj: unknown): string[] => {
  if (typeof obj !== 'object' || obj === null) {
    return [...REQUIRED_REPORTER_METHODS];
  }

  return REQUIRED_REPORTER_METHODS.filter(
    (method) => typeof (obj as Record<string, unknown>)[method] !== 'function',
  );
};

/**
 * Check if a specifier refers to a built-in reporter
 *
 * @param specifier - Reporter name or path
 * @returns True if the specifier is a built-in reporter name
 */
export const isBuiltInReporter = (specifier: string): boolean => {
  return BUILT_IN_REPORTERS.has(
    specifier as (typeof Reporters)[keyof typeof Reporters],
  );
};

/**
 * Check if a function is a class constructor
 *
 * Uses heuristics to distinguish classes from regular functions:
 *
 * - Classes have a non-writable prototype property
 * - Class syntax produces different toString() output
 *
 * @param func - Function to check
 * @returns True if the function appears to be a class constructor
 */
const isClass = (
  func: unknown,
): func is new (...args: unknown[]) => unknown => {
  if (typeof func !== 'function') {
    return false;
  }

  // Classes have a non-writable prototype
  const protoDescriptor = Object.getOwnPropertyDescriptor(func, 'prototype');
  if (!protoDescriptor || protoDescriptor.writable) {
    return false;
  }

  // Check if it uses class syntax (handles both 'class Foo' and 'class{')
  const funcStr = func.toString();
  return /^class\b/.test(funcStr);
};

/**
 * Check if a specifier looks like a file path
 *
 * @param specifier - Reporter name or path
 * @returns True if the specifier appears to be a file path
 */
export const isFilePath = (specifier: string): boolean => {
  return (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    // isAbsolute handles Windows paths like 'C:\path\to\file.js'
    isAbsolute(specifier)
  );
};

/**
 * Check if an object implements the Reporter interface
 *
 * Validates that all required methods are present and are functions.
 *
 * @param obj - Object to validate
 * @returns True if the object has all required reporter methods
 */
const isReporterObject = (obj: unknown): obj is Reporter => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return REQUIRED_REPORTER_METHODS.every(
    (method) => typeof (obj as Record<string, unknown>)[method] === 'function',
  );
};

/**
 * Load a reporter from a file path or npm package name
 *
 * Supports multiple export patterns:
 *
 * 1. Plain Reporter object (simplest, no options support)
 * 2. Class constructor (instantiated with options and context)
 * 3. Factory function (called with options and context, can be async)
 *
 * @example
 *
 * ```typescript
 * // Load from file path
 * const reporter = await loadReporter('./my-reporter.js', {
 *   verbose: true,
 * });
 *
 * // Load from npm package
 * const reporter = await loadReporter('@company/custom-reporter', {
 *   apiKey: 'xxx',
 * });
 * ```
 *
 * @param specifier - File path (relative or absolute) or npm package name
 * @param options - Options to pass to the reporter factory/constructor
 * @param cwd - Current working directory for resolving relative paths
 * @returns Loaded reporter instance
 * @throws ReporterLoadError if the module cannot be loaded
 * @throws ReporterValidationError if the module doesn't implement Reporter
 */
export const loadReporter = async (
  specifier: string,
  options: Record<string, unknown> = {},
  cwd: string = process.cwd(),
): Promise<Reporter> => {
  const context = createReporterContext();
  const resolvedSpecifier = resolveSpecifier(specifier, cwd);

  let module: unknown;

  try {
    module = await import(resolvedSpecifier);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ReporterLoadError(message, specifier, { cause: error });
  }

  // Handle ESM/CJS interop - get default export if present
  const exported = (module as { default?: unknown }).default ?? module;

  // Case 1: Already a Reporter object (plain object export)
  if (isReporterObject(exported)) {
    return exported;
  }

  // Case 2: Class constructor
  if (isClass(exported)) {
    let instance: unknown;

    try {
      instance = new (exported as new (
        options: Record<string, unknown>,
        context: ReporterContext,
      ) => unknown)(options, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ReporterLoadError(
        `Constructor threw error: ${message}`,
        specifier,
        { cause: error },
      );
    }

    validateReporter(instance, specifier);
    return instance;
  }

  // Case 3: Factory function (sync or async)
  if (typeof exported === 'function') {
    let result: unknown;

    try {
      result = await (
        exported as (
          options: Record<string, unknown>,
          context: ReporterContext,
        ) => Promise<unknown>
      )(options, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ReporterLoadError(
        `Factory function threw error: ${message}`,
        specifier,
        { cause: error },
      );
    }

    validateReporter(result, specifier);
    return result;
  }

  // None of the above - could be an object with missing methods or invalid type
  if (typeof exported === 'object' && exported !== null) {
    // It's an object but missing required methods
    const missing = getMissingMethods(exported);
    throw new ReporterValidationError(
      'Module does not implement Reporter interface.',
      specifier,
      missing,
    );
  }

  // Completely invalid export type
  throw new ReporterValidationError(
    'Module must export a Reporter object, class, or factory function.',
    specifier,
  );
};

/**
 * Resolve a specifier to an importable URL or module name
 *
 * @param specifier - File path or npm package name
 * @param cwd - Current working directory for resolving relative paths
 * @returns Resolved module specifier
 */
const resolveSpecifier = (specifier: string, cwd: string): string => {
  if (isFilePath(specifier)) {
    const absolutePath = resolve(cwd, specifier);
    return pathToFileURL(absolutePath).href;
  }

  // npm package name - return as-is for dynamic import
  return specifier;
};

/**
 * Validate that an object implements the Reporter interface
 *
 * @param obj - Object to validate
 * @param specifier - Original specifier for error messages
 * @throws ReporterValidationError if validation fails
 */
/**
 * Type signature for the validateReporter assertion function
 */
type ValidateReporterFn = (
  obj: unknown,
  specifier: string,
) => asserts obj is Reporter;

const validateReporter: ValidateReporterFn = (obj, specifier) => {
  const missing = getMissingMethods(obj);

  if (missing.length > 0) {
    throw new ReporterValidationError(
      'Module does not implement Reporter interface.',
      specifier,
      missing,
    );
  }
};
