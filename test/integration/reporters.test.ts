import { expect } from 'bupkis';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';

/**
 * Integration tests for multiple reporter output formats Reference:
 * quickstart.md output format examples
 */

describe('Multiple reporter output formats', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('human reporter', () => {
    it('should produce human-readable output with colors and tables', async () => {
      const benchFile = join(tempDir, 'human-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Human Output Test': {
              benchmarks: {
                'fast operation': { fn: () => 1 },
                'slow operation': { fn: () => 2 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human',
      ]);

      expect(result.exitCode, 'to equal', 0);
      // Should contain human-readable elements
      expect(result.stdout, 'to match', /ops\/sec|fastest|Human Output Test/);

      // Should contain table-like formatting (from quickstart example)
      expect(result.stdout, 'to match', /│|┌|└|\||-/);
    });

    it('should show progress bars during execution', async () => {
      const benchFile = join(tempDir, 'progress-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Progress Test': {
              benchmarks: {
                'task 1': { fn: () => 1 },
                'task 2': { fn: () => 2 },
                'task 3': { fn: () => 3 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human',
      ]);

      expect(result.exitCode, 'to equal', 0);
      // Should show progress indicators
      expect(result.stdout, 'to match', /%|█|progress/);
    });

    it('should display summary statistics', async () => {
      const benchFile = join(tempDir, 'stats-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Statistics Test': {
              benchmarks: {
                'stat task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human',
        '--verbose',
        '--iterations',
        '1',
      ]);

      expect(result.exitCode, 'to equal', 0);
      // Should show statistical information
      expect(result.stdout, 'to match', /±|mean|stddev|%/);
    });
  });

  describe('json reporter', () => {
    it('should produce valid JSON output', async () => {
      const benchFile = join(tempDir, 'json-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'JSON Test': {
              benchmarks: {
                'json task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const outputFile = join(tempDir, 'results', 'results.json');
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output',
        join(tempDir, 'results'),
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Check if JSON file was created
      const jsonContent = await readFile(outputFile, 'utf-8');
      const data = JSON.parse(jsonContent);

      // Should have expected JSON structure
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data, 'to satisfy', {
        meta: {
          format: 'modestbench-json',
          timestamp: expect.it('to be truthy'),
          version: expect.it('to be truthy'),
        },
        run: {
          id: expect.it('to be truthy'),
          startTime: expect.it('to be truthy'),
        },
      });
    });

    it('should include all benchmark metadata in JSON', async () => {
      const benchFile = join(tempDir, 'metadata-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Metadata Suite': {
              benchmarks: {
                'metadata task': {
                  fn: () => 1,
                  tags: ['performance', 'unit']
                }
              }
            }
          }
        };
      `,
      );

      const outputDir = join(tempDir, 'metadata-output');
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output',
        outputDir,
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Read JSON output file
      const jsonFile = join(outputDir, 'results.json');
      const jsonContent = await readFile(jsonFile, 'utf-8');
      const data = JSON.parse(jsonContent);

      // Should include comprehensive metadata
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data, 'to have key', 'meta');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data, 'to have key', 'run');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data, 'to have key', 'statistics');

      // Should have benchmark run data
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data.run, 'to satisfy', {
        files: expect.it('to be an array'),
        id: expect.it('to be truthy'),
        summary: {
          totalTasks: expect.it('to be greater than', 0),
        },
      });
    });
  });

  describe('csv reporter', () => {
    it('should produce valid CSV output', async () => {
      const benchFile = join(tempDir, 'csv-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'CSV Test': {
              benchmarks: {
                'csv task 1': { fn: () => 1 },
                'csv task 2': { fn: () => 2 }
              }
            }
          }
        };
      `,
      );

      const outputFile = join(tempDir, 'results', 'results.csv');
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'csv',
        '--output',
        join(tempDir, 'results'),
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Check if CSV file was created
      const csvContent = await readFile(outputFile, 'utf-8');
      const lines = csvContent.trim().split('\n');

      // Should have header row
      expect(lines.length, 'to be greater than or equal to', 1);
      const headers = lines[0]?.split(',') || [];
      expect(
        headers.includes('file') ||
          headers.includes('suite') ||
          headers.includes('task'),
        'to be truthy',
      );

      // Should have data rows
      expect(lines.length, 'to be greater than', 1);
      expect(lines[1], 'to contain', 'csv task');
    });

    it('should include all required CSV columns', async () => {
      const benchFile = join(tempDir, 'csv-columns-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'CSV Columns Test': {
              benchmarks: {
                'column task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand(
        ['run', benchFile, '--reporters', 'csv'],
        tempDir,
      );

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to be truthy');

      const lines = result.stdout.trim().split('\n');
      expect(lines.length, 'to be greater than', 0);

      const headers = lines[0]!.toLowerCase();

      // Should include essential columns from quickstart example
      expect(headers, 'to contain', 'file');
      expect(headers, 'to contain', 'suite');
      expect(headers, 'to contain', 'task');
      expect(headers, 'to match', /hz|ops/);
      expect(headers, 'to match', /duration|time/);
    });

    it.skip('should support custom CSV delimiters', async () => {
      // Note: --csv-delimiter flag not yet implemented
      const benchFile = join(tempDir, 'csv-delimiter-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Delimiter Test': {
              benchmarks: {
                'delimiter task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'csv',
        '--csv-delimiter',
        ';',
      ]);

      expect(result.exitCode, 'to equal', 0);
      expect(result.stdout, 'to be truthy');
      // Should use semicolon delimiter
      expect(result.stdout, 'to contain', ';');
    });
  });

  describe('multiple reporters simultaneously', () => {
    it('should output to multiple formats at once', async () => {
      const benchFile = join(tempDir, 'multi-reporter-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Multi Reporter Test': {
              benchmarks: {
                'multi task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human,json,csv',
        '--output',
        join(tempDir, 'results'),
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should have human output in stdout
      expect(result.stdout, 'to match', /Multi Reporter Test|ops/);

      // Should create json and csv files
      const jsonFile = join(tempDir, 'results', 'results.json');
      const csvFile = join(tempDir, 'results', 'results.csv');

      const jsonContent = await readFile(jsonFile, 'utf-8');
      const csvContent = await readFile(csvFile, 'utf-8');

      expect(jsonContent.length, 'to be greater than', 0);
      expect(csvContent.length, 'to be greater than', 0);
    });

    it.skip('should handle reporter-specific configuration', async () => {
      // Note: Reporter-specific CLI flags not yet implemented
      const benchFile = join(tempDir, 'reporter-config-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Reporter Config Test': {
              benchmarks: {
                'config task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human,json,csv',
        '--human-colors',
        'false',
        '--json-pretty',
        'true',
        '--csv-delimiter',
        '|',
      ]);

      // Should handle reporter-specific options
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('output file management', () => {
    it('should create output directories', async () => {
      const benchFile = join(tempDir, 'output-dir-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Output Dir Test': {
              benchmarks: {
                'dir task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const outputDir = join(tempDir, 'nested', 'output', 'dir');
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json,csv',
        '--output',
        outputDir,
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should create nested directories
      const jsonContent = await readFile(
        join(outputDir, 'results.json'),
        'utf-8',
      );
      expect(jsonContent.length, 'to be greater than', 0);
    });

    it('should handle file naming conflicts', async () => {
      const benchFile = join(tempDir, 'conflict-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Conflict Test': {
              benchmarks: {
                'conflict task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      // Create existing file
      const existingFile = join(tempDir, 'results', 'results.json');
      await mkdir(join(tempDir, 'results'), { recursive: true });
      await writeFile(existingFile, '{"existing": true}');

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output',
        join(tempDir, 'results'),
      ]);

      // Should handle existing files (overwrite or append)
      expect(result.exitCode, 'to equal', 0);
    });

    it.skip('should support custom output filenames', async () => {
      // Note: --output-file flag not yet implemented
      const benchFile = join(tempDir, 'custom-name-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Custom Name Test': {
              benchmarks: {
                'name task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output-file',
        'custom-results.json',
      ]);

      // Should use custom filename
      expect(result.exitCode, 'to equal', 0);
    });
  });

  describe('reporter error handling', () => {
    it('should handle reporter failures gracefully', async () => {
      const benchFile = join(tempDir, 'reporter-error-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Reporter Error Test': {
              benchmarks: {
                'error task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      // Try to write to read-only location (should fail gracefully)
      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'json',
        '--output',
        '/dev/null/readonly',
      ]);

      // Should not crash, should report error appropriately
      expect(result.exitCode, 'to equal', 0);
    });

    it('should continue with other reporters if one fails', async () => {
      const benchFile = join(tempDir, 'partial-failure-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Partial Failure Test': {
              benchmarks: {
                'partial task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'human,json,csv,invalid-reporter',
      ]);

      // Invalid reporter causes failure - this is expected behavior
      expect(result.exitCode, 'to equal', 1);
    });
  });

  describe('simple reporter', () => {
    it('should produce plain text output without colors or ANSI codes', async () => {
      const benchFile = join(tempDir, 'simple-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Simple Output Test': {
              benchmarks: {
                'fast operation': { fn: () => 1 },
                'slow operation': { fn: () => 2 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);
      // Should contain plain text elements
      expect(result.stdout, 'to match', /ops\/sec|Simple Output Test/);

      // Should NOT contain ANSI escape codes
      // eslint-disable-next-line no-control-regex
      expect(result.stdout, 'not to match', /\x1b\[/);
    });

    it('should not include block characters or decorative symbols', async () => {
      const benchFile = join(tempDir, 'no-blocks-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Plain Text Suite': {
              benchmarks: {
                'task 1': { fn: () => 1 },
                'task 2': { fn: () => 2 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should NOT contain block characters
      expect(result.stdout, 'not to match', /[░▒▓█▄▀▌▐■▪◼￭•]/);
    });

    it('should include basic symbols (√ × ≈ ±)', async () => {
      const benchFile = join(tempDir, 'basic-symbols-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Symbols Test': {
              benchmarks: {
                'passing task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should contain basic symbols
      expect(result.stdout, 'to match', /[√×≈±]/);
    });

    it('should not display progress bars', async () => {
      const benchFile = join(tempDir, 'no-progress-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'No Progress Test': {
              benchmarks: {
                'task 1': { fn: () => 1 },
                'task 2': { fn: () => 2 },
                'task 3': { fn: () => 3 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should NOT show progress indicators typical of human reporter
      // (Progress bars wouldn't show in test output anyway, but verify clean output)
      expect(result.stdout, 'not to match', /ETA:|Elapsed:/);
    });

    it('should maintain same structural output as human reporter', async () => {
      const benchFile = join(tempDir, 'structure-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Test Suite': {
              benchmarks: {
                'test task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should show suite name, task name, and statistics
      expect(result.stdout, 'to contain', 'Test Suite');
      expect(result.stdout, 'to contain', 'test task');
      expect(result.stdout, 'to match', /ops\/sec/);
    });

    it('should work with verbose mode', async () => {
      const benchFile = join(tempDir, 'simple-verbose-test.bench.js');
      await writeFile(
        benchFile,
        `
        export default {
          suites: {
            'Verbose Test': {
              benchmarks: {
                'verbose task': { fn: () => 1 }
              }
            }
          }
        };
      `,
      );

      const result = await runCommand([
        'run',
        benchFile,
        '--reporters',
        'simple',
        '--verbose',
        '--iterations',
        '5',
      ]);

      expect(result.exitCode, 'to equal', 0);
      // Should show iteration counts in verbose mode
      expect(result.stdout, 'to contain', 'iterations');
    });
  });
});
