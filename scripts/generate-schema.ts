#!/usr/bin/env node

/**
 * Generate JSON Schema from Zod schemas
 *
 * This script converts the ModestBench Zod configuration schema to JSON Schema
 * format, enabling IDE autocomplete and validation in config files.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as z from 'zod';

import { partialModestBenchConfigInputSchema } from '../src/config/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateSchema = async () => {
  try {
    // Convert Zod schema to JSON Schema using native Zod v4 functionality
    const jsonSchema = z.toJSONSchema(partialModestBenchConfigInputSchema, {
      target: 'draft-2020-12',
    });

    // Add top-level schema metadata
    const schemaWithMetadata = {
      $id: 'https://github.com/boneskull/modestbench/schema/config.json',
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      ...jsonSchema,
    };

    // Ensure output directory exists
    const outputPath = resolve(__dirname, '../dist/schema');
    await mkdir(outputPath, { recursive: true });

    // Write the JSON Schema to file with pretty printing
    const outputFile = resolve(outputPath, 'modestbench-config.schema.json');
    await writeFile(
      outputFile,
      JSON.stringify(schemaWithMetadata, null, 2) + '\n',
      'utf-8',
    );

    console.log(`✓ Generated JSON Schema: ${outputFile}`);
  } catch (error) {
    console.error('Failed to generate JSON Schema:', error);
    process.exit(1);
  }
};

// Run the generator
void generateSchema();
