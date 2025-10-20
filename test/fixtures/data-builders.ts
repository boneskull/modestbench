/**
 * Test Data Builders
 *
 * Thin abstraction layer for creating mock/test data. These builder functions
 * provide a single source of truth for test data structure and can easily be
 * replaced with a more sophisticated data generation library (like faker.js) in
 * the future.
 *
 * Usage: const mockRun = buildMockBenchmarkRun({ id: 'custom-id' }); const
 * mockTask = buildMockTaskResult({ name: 'my task' });
 */

import { arch, cpus, freemem, hostname, platform, totalmem } from 'node:os';

import type {
  BenchmarkRun,
  CpuInfo,
  EnvironmentInfo,
  FileResult,
  MemoryInfo,
  ModestBenchConfig,
  ProgressState,
  RunSummary,
  SuiteResult,
  TaskResult,
} from '../../src/types/index.js';

/**
 * Build a mock benchmark run object
 */
export const buildMockBenchmarkRun = (
  overrides?: Partial<BenchmarkRun>,
): BenchmarkRun => {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 5000);

  return {
    config: buildMockConfig(),
    duration: 5000,
    endTime,
    environment: buildMockEnvironment(),
    files: [buildMockFileResult()],
    id: 'test-run-123',
    startTime,
    summary: buildMockSummary(),
    ...overrides,
  };
};

/**
 * Build a mock configuration object
 */
export const buildMockConfig = (
  overrides?: Partial<ModestBenchConfig>,
): ModestBenchConfig => {
  return {
    bail: false,
    exclude: ['node_modules/**'],
    excludeTags: [],
    iterations: 100,
    limitBy: 'iterations',
    metadata: {},
    outputDir: './benchmark-results',
    pattern: '**/*.bench.{js,ts}',
    quiet: false,
    reporterConfig: {},
    reporters: ['human'],
    tags: [],
    thresholds: {},
    time: 1000,
    timeout: 30000,
    verbose: false,
    warmup: 0,
    ...overrides,
  };
};

/**
 * Build a mock CPU info object
 */
export const buildMockCpuInfo = (overrides?: Partial<CpuInfo>): CpuInfo => {
  const realCpus = cpus();
  return {
    cores: realCpus.length,
    model: realCpus[0]?.model || 'Test CPU',
    speed: realCpus[0]?.speed || 2000,
    ...overrides,
  };
};

/**
 * Build a mock environment info object
 */
export const buildMockEnvironment = (
  overrides?: Partial<EnvironmentInfo>,
): EnvironmentInfo => {
  return {
    arch: arch(),
    availableMemory: freemem(),
    cpu: buildMockCpuInfo(),
    env: {},
    hostname: hostname(),
    memory: buildMockMemoryInfo(),
    nodeVersion: process.version,
    platform: platform(),
    ...overrides,
  };
};

/**
 * Build a mock file result object
 */
export const buildMockFileResult = (
  overrides?: Partial<FileResult>,
): FileResult => {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 2000);

  return {
    duration: 2000,
    endTime,
    filePath: '/test/path/benchmark.test.js',
    startTime,
    suites: [buildMockSuiteResult()],
    ...overrides,
  };
};

/**
 * Build a mock memory info object
 */
export const buildMockMemoryInfo = (
  overrides?: Partial<MemoryInfo>,
): MemoryInfo => {
  const total = totalmem();
  const free = freemem();
  return {
    free,
    total,
    used: total - free,
    ...overrides,
  };
};

/**
 * Build a mock progress state object
 */
export const buildMockProgressState = (
  overrides?: Partial<ProgressState>,
): ProgressState => {
  return {
    currentFile: 'test.bench.js',
    currentSuite: 'test suite',
    currentTask: 'test task',
    elapsed: 1000,
    filesCompleted: 0,
    percentage: 20,
    suitesCompleted: 0,
    tasksCompleted: 0,
    totalFiles: 1,
    totalSuites: 1,
    totalTasks: 5,
    ...overrides,
  };
};

/**
 * Build a mock suite result object
 */
export const buildMockSuiteResult = (
  overrides?: Partial<SuiteResult>,
): SuiteResult => {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 1000);

  return {
    duration: 1000,
    endTime,
    name: 'test suite',
    startTime,
    tasks: [buildMockTaskResult()],
    ...overrides,
  };
};

/**
 * Build a mock run summary object
 */
export const buildMockSummary = (
  overrides?: Partial<RunSummary>,
): RunSummary => {
  return {
    failedTasks: 0,
    fastest: null,
    overallMean: 1000,
    passedTasks: 1,
    slowest: null,
    totalFiles: 1,
    totalOperations: 1000,
    totalSuites: 1,
    totalTasks: 1,
    ...overrides,
  };
};

/**
 * Build a mock task result object
 */
export const buildMockTaskResult = (
  overrides?: Partial<TaskResult>,
): TaskResult => {
  return {
    iterations: 1000,
    marginOfError: 1.5,
    max: 2000,
    mean: 1000,
    min: 500,
    name: 'test task',
    opsPerSecond: 1_000_000,
    p95: 1800,
    p99: 1950,
    stdDev: 200,
    variance: 40_000,
    ...overrides,
  };
};
