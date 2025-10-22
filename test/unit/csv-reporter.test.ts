import { expect } from 'bupkis';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { BenchmarkRun, TaskResult } from '../../src/types/index.js';

import { CsvReporter } from '../../src/reporters/csv.js';
import { nullStream } from '../util.js';

// Squelch stdout during tests
const originalStdout = process.stdout.write;

/**
 * Create a minimal mock BenchmarkRun for testing
 */
const createMockRun = (): BenchmarkRun => {
  return {
    ci: {
      provider: 'github',
    },
    config: {
      bail: false,
      exclude: [],
      excludeTags: [],
      iterations: 0,
      limitBy: 'iterations',
      metadata: {},
      outputDir: '',
      pattern: '',
      quiet: false,
      reporterConfig: {},
      reporters: [],
      tags: [],
      thresholds: {},
      time: 0,
      timeout: 0,
      verbose: false,
      warmup: 0,
    },
    duration: 0,
    endTime: new Date(),
    environment: {
      arch: 'x64',
      availableMemory: 0,
      cpu: {
        cores: 8,
        model: 'Intel Core i7',
        speed: 0,
      },
      env: {},
      hostname: '',
      memory: {
        free: 8000000000,
        total: 16000000000,
        used: 0,
      },
      nodeVersion: 'v20.0.0',
      platform: 'linux',
    },
    files: [],
    git: {
      author: '',
      branch: 'main',
      commit: 'abc123',
      dirty: false,
      message: '',
      modifiedFiles: [],
      timestamp: new Date(),
    },
    id: 'test-run',
    startTime: new Date(),
    summary: {
      failedTasks: 0,
      fastest: null,
      overallMean: 1000000,
      passedTasks: 1,
      slowest: null,
      totalFiles: 1,
      totalOperations: 100,
      totalSuites: 1,
      totalTasks: 1,
    },
  };
};

/**
 * Create a minimal mock TaskResult for testing
 */
const createMockTaskResult = (
  overrides: Partial<TaskResult> = {},
): TaskResult => {
  return {
    cv: 5, // 50000/1000000 * 100 = 5%
    iterations: 100,
    marginOfError: 2.5,
    max: 1050000,
    mean: 1000000,
    min: 950000,
    name: 'test task',
    opsPerSecond: 1000,
    p95: 1040000,
    p99: 1045000,
    stdDev: 50000,
    variance: 2500000000,
    ...overrides,
  };
};

describe('CsvReporter', () => {
  beforeEach(() => {
    // Redirect stdout to null stream
    process.stdout.write = nullStream.write.bind(nullStream);
  });

  afterEach(() => {
    // Restore stdout
    process.stdout.write = originalStdout;
  });

  describe('configuration options', () => {
    it('should use default delimiter (comma)', () => {
      const reporter = new CsvReporter();
      expect(reporter.getDelimiter(), 'to equal', ',');
    });

    it('should accept custom delimiter', () => {
      const reporter = new CsvReporter({ delimiter: ';' });
      expect(reporter.getDelimiter(), 'to equal', ';');
    });

    it('should use default quote (double quote)', () => {
      const reporter = new CsvReporter();
      expect(reporter.getQuote(), 'to equal', '"');
    });

    it('should accept custom quote', () => {
      const reporter = new CsvReporter({ quote: "'" });
      expect(reporter.getQuote(), 'to equal', "'");
    });

    it('should include headers by default', () => {
      const reporter = new CsvReporter();
      expect(reporter.areHeadersIncluded(), 'to be true');
    });

    it('should allow disabling headers', () => {
      const reporter = new CsvReporter({ includeHeaders: false });
      expect(reporter.areHeadersIncluded(), 'to be false');
    });

    it('should include metadata by default', () => {
      const reporter = new CsvReporter();
      expect(reporter.isMetadataIncluded(), 'to be true');
    });

    it('should allow disabling metadata', () => {
      const reporter = new CsvReporter({ includeMetadata: false });
      expect(reporter.isMetadataIncluded(), 'to be false');
    });

    it('should accept output path', () => {
      const reporter = new CsvReporter({ outputPath: '/tmp/test.csv' });
      expect(reporter.getOutputPath(), 'to equal', '/tmp/test.csv');
    });

    it('should have no output path by default', () => {
      const reporter = new CsvReporter();
      expect(reporter.getOutputPath(), 'to be undefined');
    });
  });

  describe('row collection', () => {
    it('should start with zero rows', () => {
      const reporter = new CsvReporter();
      expect(reporter.getRowCount(), 'to equal', 0);
    });

    it('should increment row count when task results are added', () => {
      const reporter = new CsvReporter();
      const run = createMockRun();

      reporter.onStart(run);
      reporter.onFileStart('test.bench.ts');
      reporter.onSuiteStart('test suite');
      reporter.onTaskResult(createMockTaskResult({ name: 'task 1' }));
      reporter.onTaskResult(createMockTaskResult({ name: 'task 2' }));

      expect(reporter.getRowCount(), 'to equal', 2);
    });

    it('should reset rows on new run', () => {
      const reporter = new CsvReporter();
      const run = createMockRun();

      // First run
      reporter.onStart(run);
      reporter.onFileStart('test.bench.ts');
      reporter.onSuiteStart('test suite');
      reporter.onTaskResult(createMockTaskResult());
      expect(reporter.getRowCount(), 'to equal', 1);

      // Second run
      reporter.onStart(run);
      expect(reporter.getRowCount(), 'to equal', 0);
    });
  });

  describe('CSV output generation', () => {
    it('should generate CSV with headers and data', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        expect(output, 'not to be empty');
        const lines = output.trim().split('\n');
        expect(lines.length, 'to be greater than', 1);

        // First line should be headers
        const headers = lines[0];
        expect(headers, 'to contain', 'file');
        expect(headers, 'to contain', 'suite');
        expect(headers, 'to contain', 'task');
      } finally {
        console.log = originalLog;
      }
    });

    it('should omit headers when includeHeaders is false', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter({ includeHeaders: false });
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        expect(output, 'not to be empty');
        const lines = output.trim().split('\n');

        // Should only have data rows, no header
        // First line should start with data (file path), not header word "file"
        const firstLine = lines[0];
        expect(firstLine, 'to start with', 'test.bench.ts');
      } finally {
        console.log = originalLog;
      }
    });

    it('should include metadata columns when includeMetadata is true', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter({ includeMetadata: true });
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        const headers = output.trim().split('\n')[0];
        expect(headers, 'to contain', 'nodeVersion');
        expect(headers, 'to contain', 'platform');
        expect(headers, 'to contain', 'cpuModel');
      } finally {
        console.log = originalLog;
      }
    });

    it('should omit metadata columns when includeMetadata is false', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter({ includeMetadata: false });
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        const headers = output.trim().split('\n')[0];
        expect(headers, 'not to contain', 'nodeVersion');
        expect(headers, 'not to contain', 'platform');
        expect(headers, 'not to contain', 'cpuModel');
      } finally {
        console.log = originalLog;
      }
    });

    it('should use custom delimiter', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter({ delimiter: ';' });
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        const headers = output.trim().split('\n')[0];
        expect(headers, 'to contain', ';');
        expect(headers, 'not to contain', ',');
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle empty results (no tasks)', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        await reporter.onEnd(run);

        expect(output, 'not to be empty');
        const lines = output.trim().split('\n');

        // Should have just headers
        expect(lines.length, 'to equal', 1);
        expect(lines[0], 'to contain', 'file');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('CSV escaping', () => {
    it('should escape values containing delimiter', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test,with,commas.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        const dataLine = output.trim().split('\n')[1];
        // Should quote the filename since it contains commas
        expect(dataLine, 'to contain', '"test,with,commas.bench.ts"');
      } finally {
        console.log = originalLog;
      }
    });

    it('should escape values containing quotes', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test "quoted" suite');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        const dataLine = output.trim().split('\n')[1];
        // Should double the quotes and wrap in quotes
        expect(dataLine, 'to contain', '"test ""quoted"" suite"');
      } finally {
        console.log = originalLog;
      }
    });

    it('should escape values containing newlines', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test\nmultiline\nsuite');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        // The full output should contain the quoted multiline value
        expect(output, 'to contain', '"test\nmultiline\nsuite"');
      } finally {
        console.log = originalLog;
      }
    });

    it('should escape suite names containing delimiter', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('suite, with, commas');
        reporter.onTaskResult(createMockTaskResult());
        await reporter.onEnd(run);

        const dataLine = output.trim().split('\n')[1];
        // Should quote the suite name since it contains commas
        expect(dataLine, 'to contain', '"suite, with, commas"');
      } finally {
        console.log = originalLog;
      }
    });

    it('should escape task names containing delimiter', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(
          createMockTaskResult({ name: 'task, with, commas' }),
        );
        await reporter.onEnd(run);

        const dataLine = output.trim().split('\n')[1];
        // Should quote the task name since it contains commas
        expect(dataLine, 'to contain', '"task, with, commas"');
      } finally {
        console.log = originalLog;
      }
    });

    it('should escape task names containing quotes', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(
          createMockTaskResult({ name: 'task "with quotes"' }),
        );
        await reporter.onEnd(run);

        const dataLine = output.trim().split('\n')[1];
        // Should double the quotes and wrap in quotes
        expect(dataLine, 'to contain', '"task ""with quotes"""');
      } finally {
        console.log = originalLog;
      }
    });

    it('should escape task names containing newlines', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(
          createMockTaskResult({ name: 'task\nwith\nnewlines' }),
        );
        await reporter.onEnd(run);

        // The full output should contain the quoted multiline task name
        expect(output, 'to contain', '"task\nwith\nnewlines"');
      } finally {
        console.log = originalLog;
      }
    });

    it('should escape multiple special characters in same value', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('suite, with "quotes" and\nnewlines');
        reporter.onTaskResult(
          createMockTaskResult({
            name: 'task, with "quotes" and\nnewlines',
          }),
        );
        await reporter.onEnd(run);

        // Can't use split('\n') because the values themselves contain newlines
        // Just verify the full output contains properly escaped values
        expect(output, 'to contain', '"suite, with ""quotes"" and\nnewlines"');
        expect(output, 'to contain', '"task, with ""quotes"" and\nnewlines"');
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle custom delimiter with appropriate escaping', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter({ delimiter: ';' });
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('suite; with; semicolons');
        reporter.onTaskResult(
          createMockTaskResult({ name: 'task; with; semicolons' }),
        );
        await reporter.onEnd(run);

        const dataLine = output.trim().split('\n')[1];
        // Should quote values containing the custom delimiter
        expect(dataLine, 'to contain', '"suite; with; semicolons"');
        expect(dataLine, 'to contain', '"task; with; semicolons"');
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle carriage returns in values', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('suite\rwith\rCR');
        reporter.onTaskResult(createMockTaskResult({ name: 'task\rwith\rCR' }));
        await reporter.onEnd(run);

        // The full output should contain the quoted values with CR
        expect(output, 'to contain', '"suite\rwith\rCR"');
        expect(output, 'to contain', '"task\rwith\rCR"');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('error handling', () => {
    it('should include error message when task has error', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        output = msg;
      };

      try {
        const reporter = new CsvReporter();
        const run = createMockRun();

        reporter.onStart(run);
        reporter.onFileStart('test.bench.ts');
        reporter.onSuiteStart('test suite');
        reporter.onTaskResult(
          createMockTaskResult({
            error: new Error('Test error message'),
          }),
        );
        await reporter.onEnd(run);

        expect(output, 'to contain', 'Test error message');
      } finally {
        console.log = originalLog;
      }
    });

    it('should not add row when currentRun is not set', () => {
      const reporter = new CsvReporter();

      // Call onTaskResult without calling onStart first
      reporter.onTaskResult(createMockTaskResult());

      expect(reporter.getRowCount(), 'to equal', 0);
    });
  });
});
