/**
 * Integration tests for JSON reporter pretty-print configuration
 *
 * Tests CLI flag `--json-pretty` and config file
 * `reporterConfig.json.prettyPrint` options with proper precedence handling.
 *
 * @packageDocumentation
 */

import { expect } from 'bupkis';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { runCommand } from '../util.js';
import { fixtures } from './fixture-paths.js';

describe('JSON reporter prettyPrint configuration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modestbench-json-pretty-'));
  });

  afterEach(async () => {
    await rm(tempDir, { force: true, recursive: true });
  });

  describe('default behavior', () => {
    it('should output compact JSON by default (no newlines in JSON body)', async () => {
      const outputFile = join(tempDir, 'results.json');

      // Create an empty config file to override any project-level config
      const configPath = join(tempDir, 'modestbench.config.json');
      await writeFile(configPath, JSON.stringify({}));

      const result = await runCommand([
        'run',
        fixtures.simple,
        '--config',
        configPath,
        '--reporter',
        'json',
        '--output-file',
        outputFile,
      ]);

      expect(result.exitCode, 'to equal', 0);

      const jsonContent = await readFile(outputFile, 'utf-8');

      // Compact JSON should be a single line (no newlines except possibly at the end)
      const lines = jsonContent.trim().split('\n');
      expect(lines.length, 'to equal', 1);

      // Should still be valid JSON
      const data = JSON.parse(jsonContent);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data, 'to have keys', ['meta', 'run', 'statistics']);
    });
  });

  describe('--json-pretty CLI flag', () => {
    it('should output formatted JSON when --json-pretty is specified', async () => {
      const outputFile = join(tempDir, 'results.json');
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--reporter',
        'json',
        '--json-pretty',
        '--output-file',
        outputFile,
      ]);

      expect(result.exitCode, 'to equal', 0);

      const jsonContent = await readFile(outputFile, 'utf-8');

      // Pretty-printed JSON should have multiple lines
      const lines = jsonContent.trim().split('\n');
      expect(lines.length, 'to be greater than', 1);

      // Should still be valid JSON
      const data = JSON.parse(jsonContent);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(data, 'to have keys', ['meta', 'run', 'statistics']);
    });
  });

  describe('config file reporterConfig.json.prettyPrint', () => {
    it('should output formatted JSON when config sets prettyPrint: true', async () => {
      const outputFile = join(tempDir, 'results.json');

      // Create a config file with prettyPrint: true
      const configPath = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          reporterConfig: {
            json: {
              prettyPrint: true,
            },
          },
        }),
      );

      const result = await runCommand([
        'run',
        fixtures.simple,
        '--config',
        configPath,
        '--reporter',
        'json',
        '--output-file',
        outputFile,
      ]);

      expect(result.exitCode, 'to equal', 0);

      const jsonContent = await readFile(outputFile, 'utf-8');

      // Pretty-printed JSON should have multiple lines
      const lines = jsonContent.trim().split('\n');
      expect(lines.length, 'to be greater than', 1);
    });

    it('should output compact JSON when config sets prettyPrint: false', async () => {
      const outputFile = join(tempDir, 'results.json');

      // Create a config file with prettyPrint: false
      const configPath = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          reporterConfig: {
            json: {
              prettyPrint: false,
            },
          },
        }),
      );

      const result = await runCommand([
        'run',
        fixtures.simple,
        '--config',
        configPath,
        '--reporter',
        'json',
        '--output-file',
        outputFile,
      ]);

      expect(result.exitCode, 'to equal', 0);

      const jsonContent = await readFile(outputFile, 'utf-8');

      // Compact JSON should be a single line
      const lines = jsonContent.trim().split('\n');
      expect(lines.length, 'to equal', 1);
    });
  });

  describe('precedence: CLI flag overrides config', () => {
    it('--json-pretty should override config prettyPrint: false', async () => {
      const outputFile = join(tempDir, 'results.json');

      // Create a config file with prettyPrint: false
      const configPath = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          reporterConfig: {
            json: {
              prettyPrint: false,
            },
          },
        }),
      );

      // CLI flag --json-pretty should override the config
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--config',
        configPath,
        '--reporter',
        'json',
        '--json-pretty',
        '--output-file',
        outputFile,
      ]);

      expect(result.exitCode, 'to equal', 0);

      const jsonContent = await readFile(outputFile, 'utf-8');

      // Should be pretty-printed despite config setting prettyPrint: false
      const lines = jsonContent.trim().split('\n');
      expect(lines.length, 'to be greater than', 1);
    });

    it('--no-json-pretty should override config prettyPrint: true', async () => {
      const outputFile = join(tempDir, 'results.json');

      // Create a config file with prettyPrint: true
      const configPath = join(tempDir, 'modestbench.config.json');
      await writeFile(
        configPath,
        JSON.stringify({
          reporterConfig: {
            json: {
              prettyPrint: true,
            },
          },
        }),
      );

      // CLI flag --no-json-pretty should override the config
      const result = await runCommand([
        'run',
        fixtures.simple,
        '--config',
        configPath,
        '--reporter',
        'json',
        '--no-json-pretty',
        '--output-file',
        outputFile,
      ]);

      expect(result.exitCode, 'to equal', 0);

      const jsonContent = await readFile(outputFile, 'utf-8');

      // Should be compact despite config setting prettyPrint: true
      const lines = jsonContent.trim().split('\n');
      expect(lines.length, 'to equal', 1);
    });
  });
});
