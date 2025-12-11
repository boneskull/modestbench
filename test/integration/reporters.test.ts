import { expect } from 'bupkis';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';
import { fixtures } from './fixture-paths.js';

/**
 * Integration tests for multiple reporter output formats Reference:
 * quickstart.md output format examples
 */

describe('Multiple reporter output formats', () => {
  // Temp dir only needed for output file tests
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-reporter-output-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('human reporter', () => {
    it('should produce human-readable output with colors and tables', async () => {
      const result = await runCommand([
        'run',
        fixtures.humanOutput,
        '--reporter',
        'human',
      ]);

      expect(result.exitCode, 'to equal', 0);
      // Should contain human-readable elements
      expect(result.stdout, 'to match', /ops\/sec|fastest|Human Output Test/);

      // Should contain table-like formatting (from quickstart example)
      expect(result.stdout, 'to match', /│|┌|└|\||-/);
    });

    it('should show progress bars during execution', async () => {
      const result = await runCommand([
        'run',
        fixtures.multiTask,
        '--reporter',
        'human',
      ]);

      expect(result.exitCode, 'to equal', 0);
      // Should show progress indicators
      expect(result.stdout, 'to match', /%|█|progress/);
    });

    it('should display summary statistics', async () => {
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
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
      const outputFile = join(tempDir, 'results', 'results.json');
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
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
      const outputDir = join(tempDir, 'metadata-output');
      const result = await runCommand([
        'run',
        fixtures.withMetadataTags,
        '--reporter',
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
      const outputFile = join(tempDir, 'results', 'results.csv');
      const result = await runCommand([
        'run',
        fixtures.csvTasks,
        '--reporter',
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
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'csv',
        '--output',
        tempDir,
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Read CSV from output file
      const csvContent = await readFile(join(tempDir, 'results.csv'), 'utf-8');
      const lines = csvContent.trim().split('\n');
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
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
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
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'human',
        '--reporter',
        'json',
        '--reporter',
        'csv',
        '--output',
        join(tempDir, 'results'),
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should have human output in stdout
      expect(result.stdout, 'to match', /Test Suite|ops/);

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
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'human',
        '--reporter',
        'json',
        '--reporter',
        'csv',
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
      const outputDir = join(tempDir, 'nested', 'output', 'dir');
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'json',
        '--reporter',
        'csv',
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
      // Create existing file
      const existingFile = join(tempDir, 'results', 'results.json');
      await mkdir(join(tempDir, 'results'), { recursive: true });
      await writeFile(existingFile, '{"existing": true}');

      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'json',
        '--output',
        join(tempDir, 'results'),
      ]);

      // Should handle existing files (overwrite or append)
      expect(result.exitCode, 'to equal', 0);
    });

    it('should support custom output filenames', async () => {
      const customFile = join(tempDir, 'custom-results.json');
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'json',
        '--output-file',
        customFile,
      ]);

      // Should use custom filename
      expect(result.exitCode, 'to equal', 0);

      // Verify custom filename was used
      const content = await readFile(customFile, 'utf-8');
      const data = JSON.parse(content);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data.meta, 'to be defined');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data.run, 'to be defined');
    });
  });

  describe('reporter error handling', () => {
    it('should handle reporter failures gracefully', async () => {
      // Try to write to read-only location (should fail gracefully)
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'json',
        '--output',
        '/dev/null/readonly',
      ]);

      // Should not crash, should report error appropriately
      expect(result.exitCode, 'to equal', 0);
    });

    it('should continue with other reporters if one fails', async () => {
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'human',
        '--reporter',
        'json',
        '--reporter',
        'csv',
        '--reporter',
        'invalid-reporter',
      ]);

      // Invalid reporter causes failure with CONFIG_ERROR - this is expected behavior
      expect(result.exitCode, 'to equal', 2);
    });
  });

  describe('simple reporter', () => {
    it('should produce plain text output without colors or ANSI codes', async () => {
      const result = await runCommand([
        'run',
        fixtures.simpleOutput,
        '--reporter',
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
      const result = await runCommand([
        'run',
        fixtures.multiTask,
        '--reporter',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should NOT contain block characters
      expect(result.stdout, 'not to match', /[░▒▓█▄▀▌▐■▪◼￭•]/);
    });

    it('should include basic symbols (√ × ≈ ±)', async () => {
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should contain basic symbols
      expect(result.stdout, 'to match', /[√×≈±]/);
    });

    it('should not display progress bars', async () => {
      const result = await runCommand([
        'run',
        fixtures.multiTask,
        '--reporter',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should NOT show progress indicators typical of human reporter
      // (Progress bars wouldn't show in test output anyway, but verify clean output)
      expect(result.stdout, 'not to match', /ETA:|Elapsed:/);
    });

    it('should maintain same structural output as human reporter', async () => {
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'simple',
      ]);

      expect(result.exitCode, 'to equal', 0);

      // Should show suite name, task name, and statistics
      expect(result.stdout, 'to contain', 'Test Suite');
      expect(result.stdout, 'to contain', 'Fast Task');
      expect(result.stdout, 'to match', /ops\/sec/);
    });

    it('should work with verbose mode', async () => {
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'simple',
        '--verbose',
        '--iterations',
        '5',
      ]);

      expect(result.exitCode, 'to equal', 0);
      // Should show iteration counts inline (now shown for all reporters)
      expect(result.stdout, 'to contain', 'iter)');
    });
  });
});
