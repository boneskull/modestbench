/**
 * ModestBench Init Command
 *
 * Initialize a new benchmark project with configuration files, directory
 * structure, and optional example benchmark files.
 */

import {
  access,
  appendFile,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

import type { CliContext } from '../index.js';

import {
  InvalidArgumentError,
  UnsupportedConfigFormatError,
} from '../../errors/index.js';

/**
 * Init command options interface
 */
interface InitOptions {
  configType: 'js' | 'json' | 'ts' | 'yaml';
  cwd: string;
  examples: boolean;
  force?: boolean | undefined;
  quiet?: boolean | undefined;
  type: 'advanced' | 'basic' | 'library';
  verbose?: boolean | undefined;
  yes?: boolean | undefined;
}

/**
 * Project templates for different initialization types
 */
const PROJECT_TEMPLATES = {
  advanced: {
    configOptions: {
      iterations: 1000,
      outputDir: './benchmark-results',
      pattern: 'benchmarks/**/*.bench.{js,ts}',
      reporters: ['human', 'json'],
      time: 10000,
      warmup: 50,
    },
    description: 'Feature-rich setup with multiple reporters and configuration',
    directories: ['benchmarks', 'benchmark-results'],
    name: 'Advanced Project',
  },
  basic: {
    configOptions: {
      iterations: 100,
      pattern: 'benchmarks/**/*.bench.{js,ts}',
      reporters: ['human'],
      time: 5000,
    },
    description: 'Simple benchmark setup for small projects',
    directories: ['benchmarks'],
    name: 'Basic Project',
  },
  library: {
    configOptions: {
      bail: false,
      iterations: 5000,
      outputDir: './benchmark-results',
      pattern: 'benchmarks/**/*.bench.{js,ts}',
      reporters: ['human', 'json'],
      time: 15000,
      warmup: 100,
    },
    description: 'Optimized for library performance testing',
    directories: ['benchmarks', 'benchmarks/suites', 'benchmark-results'],
    name: 'Library Project',
  },
} as const;

/**
 * Example benchmark files
 */
const EXAMPLE_BENCHMARKS = {
  arrayMethods: {
    content: `/**
 * Array Methods Performance Benchmark
 *
 * Compares performance of different array iteration methods.
 */

export default {
  name: 'Array Methods',

  setup() {
    // Setup data for benchmarks
    this.smallArray = Array.from({ length: 100 }, (_, i) => i);
    this.largeArray = Array.from({ length: 10000 }, (_, i) => i);
  },

  benchmarks: {
    'for loop (small array)': {
      fn() {
        let sum = 0;
        for (let i = 0; i < this.smallArray.length; i++) {
          sum += this.smallArray[i];
        }
        return sum;
      }
    },

    'forEach (small array)': {
      fn() {
        let sum = 0;
        this.smallArray.forEach(n => sum += n);
        return sum;
      }
    },

    'reduce (small array)': {
      fn() {
        return this.smallArray.reduce((sum, n) => sum + n, 0);
      }
    },

    'for loop (large array)': {
      fn() {
        let sum = 0;
        for (let i = 0; i < this.largeArray.length; i++) {
          sum += this.largeArray[i];
        }
        return sum;
      }
    },

    'forEach (large array)': {
      fn() {
        let sum = 0;
        this.largeArray.forEach(n => sum += n);
        return sum;
      }
    },

    'reduce (large array)': {
      fn() {
        return this.largeArray.reduce((sum, n) => sum + n, 0);
      }
    }
  }
};
`,
    filename: 'array-methods.bench.js',
  },

  example: {
    content: `/**
 * Example Benchmark File
 *
 * This is a simple example demonstrating basic benchmarking setup.
 */

export default {
  name: 'Example Benchmarks',

  benchmarks: {
    'simple addition': {
      fn() {
        return 1 + 1;
      }
    },

    'array creation': {
      fn() {
        return Array.from({ length: 100 }, (_, i) => i);
      }
    },

    'string manipulation': {
      fn() {
        return 'Hello, World!'.toUpperCase();
      }
    }
  }
};
`,
    filename: 'example.bench.js',
  },

  stringOperations: {
    content: `/**
 * String Operations Performance Benchmark
 *
 * Tests various string manipulation techniques.
 */

export default {
  name: 'String Operations',

  setup() {
    this.baseString = 'Hello, World!';
    this.longString = 'Lorem ipsum '.repeat(1000);
    this.template = 'Hello, {name}!';
  },

  benchmarks: {
    'string concatenation': {
      fn() {
        return this.baseString + ' How are you?';
      }
    },

    'template literals': {
      fn() {
        return \`\${this.baseString} How are you?\`;
      }
    },

    'string replace': {
      fn() {
        return this.template.replace('{name}', 'ModestBench');
      }
    },

    'string includes': {
      fn() {
        return this.longString.includes('ipsum');
      }
    },

    'regex test': {
      fn() {
        return /ipsum/.test(this.longString);
      }
    }
  }
};
`,
    filename: 'string-operations.bench.js',
  },
} as const;

/**
 * Prompt user for confirmation with Y/n default to Yes
 */
const promptUser = async (question: string): Promise<boolean> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      // Default to Yes if empty or starts with 'y'
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
};

/**
 * Handle init command
 */
export const handleInitCommand = async (
  context: CliContext,
  options: InitOptions,
): Promise<number> => {
  try {
    const template = PROJECT_TEMPLATES[options.type];

    if (!options.quiet) {
      console.log(`Initializing ${template.name}...`);
      console.log(template.description);
      console.log();
    }

    // Check if project already exists
    if (!options.force) {
      const hasConflicts = await checkForConflicts(options);
      if (hasConflicts) {
        console.error('Project files already exist. Use --force to overwrite.');
        return 1; // Already initialized
      }
    }

    // Create directory structure
    await createDirectories(template.directories, options);

    // Create configuration file
    await createConfigFile(template.configOptions, options);

    // Create example benchmarks if requested
    if (options.examples) {
      await createExampleBenchmarks(options);
    }

    // Create additional files
    await createAdditionalFiles(options);

    if (!options.quiet) {
      console.log('✅ Project initialized successfully!');
      console.log();
      console.log('Next steps:');
      if (options.examples) {
        console.log('  1. Run example benchmarks: modestbench run');
      } else {
        console.log(
          '  1. Create your first benchmark file in the benchmarks/ directory',
        );
      }
      console.log('  2. Customize configuration in your config file');
      console.log('  3. Add your own benchmark suites');
      console.log();
      console.log(
        'Documentation: https://github.com/your-org/modestbench#readme',
      );
    }

    return 0;
  } catch (error) {
    console.error(
      'Init command failed:',
      error instanceof Error ? error.message : String(error),
    );

    if (options.verbose && error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    return 5; // Runtime error
  }
};

/**
 * Check for existing files that would conflict
 */
const checkForConflicts = async (options: InitOptions): Promise<boolean> => {
  const filesToCheck = [
    'modestbench.config.' + options.configType,
    'benchmarks',
  ];

  for (const file of filesToCheck) {
    try {
      await access(resolve(options.cwd, file));
      return true; // File exists, conflict detected
    } catch {
      // File doesn't exist, no conflict
    }
  }

  return false;
};

/**
 * Handle .gitignore file creation or modification
 */
const handleGitignore = async (options: InitOptions): Promise<void> => {
  const gitignorePath = resolve(options.cwd, '.gitignore');
  const modestbenchEntry = '.modestbench/';

  // Default .gitignore content for new files
  const defaultGitignoreContent = `# ModestBench
benchmark-results/
.modestbench/

# Dependencies
node_modules/

# Environment
.env
.env.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db
`;

  try {
    // Check if .gitignore exists
    let gitignoreExists = false;
    try {
      await access(gitignorePath);
      gitignoreExists = true;
    } catch {
      // File doesn't exist
    }

    if (!gitignoreExists) {
      // Create new .gitignore with full content
      await writeFile(gitignorePath, defaultGitignoreContent, 'utf8');
      if (options.verbose) {
        console.log('  ✓ .gitignore');
      }
      return;
    }

    // File exists, check if .modestbench/ is already present
    const existingContent = await readFile(gitignorePath, 'utf8');

    // Check if .modestbench/ is already in the file
    const hasModestbenchEntry = existingContent
      .split('\n')
      .some((line) => line.trim() === modestbenchEntry);

    if (hasModestbenchEntry) {
      // Already has the entry, nothing to do
      if (options.verbose) {
        console.log('  ✓ .gitignore (already contains .modestbench/)');
      }
      return;
    }

    // Determine if we should prompt or auto-add
    let shouldAdd = false;

    if (options.yes || options.quiet) {
      // Auto-accept in non-interactive mode
      shouldAdd = true;
    } else {
      // Prompt the user
      console.log();
      console.log(
        'The .modestbench/ directory stores benchmark history and should typically',
      );
      console.log('not be committed to version control.');
      console.log();

      shouldAdd = await promptUser(
        'Would you like to add .modestbench/ to .gitignore? (Y/n) ',
      );
    }

    if (shouldAdd) {
      // Append .modestbench/ to existing .gitignore
      let contentToAppend = '';

      // Ensure file ends with newline
      if (!existingContent.endsWith('\n')) {
        contentToAppend += '\n';
      }

      // Add a blank line if the file doesn't end with one
      if (!existingContent.endsWith('\n\n') && existingContent.trim() !== '') {
        contentToAppend += '\n';
      }

      // Add comment and entry
      contentToAppend += '# ModestBench history\n';
      contentToAppend += modestbenchEntry + '\n';

      await appendFile(gitignorePath, contentToAppend, 'utf8');

      if (options.verbose || !options.quiet) {
        console.log('  ✓ Added .modestbench/ to .gitignore');
      }
    } else {
      if (options.verbose) {
        console.log('  ⊘ Skipped adding .modestbench/ to .gitignore');
      }
    }
  } catch (error) {
    // Non-critical, just warn
    console.warn(
      'Warning: Could not create/modify .gitignore file:',
      error instanceof Error ? error.message : String(error),
    );
  }
};

/**
 * Create additional project files
 */
const createAdditionalFiles = async (options: InitOptions): Promise<void> => {
  if (!options.quiet) {
    console.log('Creating additional files...');
  }

  // Handle .gitignore
  await handleGitignore(options);

  // Create README.md
  const readmeContent = `# Benchmark Project

This project uses [ModestBench](https://github.com/your-org/modestbench) for performance testing.

## Getting Started

Run all benchmarks:
\`\`\`bash
modestbench run
\`\`\`

Run specific benchmarks:
\`\`\`bash
modestbench run "benchmarks/array-*.bench.js"
\`\`\`

View benchmark history:
\`\`\`bash
modestbench history list
\`\`\`

## Configuration

See \`modestbench.config.*\` for benchmark configuration options.

## Writing Benchmarks

Create new benchmark files in the \`benchmarks/\` directory. See the examples for the expected format.
`;

  try {
    const readmePath = resolve(options.cwd, 'README.md');
    await writeFile(readmePath, readmeContent, 'utf8');
    if (options.verbose) {
      console.log('  ✓ README.md');
    }
  } catch {
    // Non-critical, just warn
    console.warn('Warning: Could not create README.md file');
  }
};

/**
 * Create configuration file
 */
const createConfigFile = async (
  configOptions: any,
  options: InitOptions,
): Promise<void> => {
  const filename = `modestbench.config.${options.configType}`;
  const filePath = resolve(options.cwd, filename);

  if (!options.quiet) {
    console.log(`Creating configuration file: ${filename}`);
  }

  let content: string;

  switch (options.configType) {
    case 'js':
      content = `export default ${JSON.stringify(configOptions, null, 2)};\n`;
      break;

    case 'json':
      content = JSON.stringify(configOptions, null, 2);
      break;

    case 'ts':
      content = `import type { ModestBenchConfig } from 'modestbench';

const config: ModestBenchConfig = ${JSON.stringify(configOptions, null, 2)};

export default config;
`;
      break;

    case 'yaml':
      // Simple YAML generation (could use a proper YAML library)
      content = generateSimpleYaml(configOptions);
      break;

    default:
      throw new UnsupportedConfigFormatError(
        `Unsupported config format: ${options.configType}`,
      );
  }

  try {
    await writeFile(filePath, content, 'utf8');
    if (options.verbose) {
      console.log(`  ✓ ${filename}`);
    }
  } catch (error) {
    throw new InvalidArgumentError(
      `Failed to create config file: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
};

/**
 * Create directory structure
 */
const createDirectories = async (
  directories: readonly string[],
  options: InitOptions,
): Promise<void> => {
  if (!options.quiet) {
    console.log('Creating directories...');
  }

  for (const dir of directories) {
    const dirPath = resolve(options.cwd, dir);
    try {
      await mkdir(dirPath, { recursive: true });
      if (options.verbose) {
        console.log(`  ✓ ${dir}/`);
      }
    } catch (error) {
      throw new InvalidArgumentError(
        `Failed to create directory ${dir}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
};

/**
 * Create example benchmark files
 */
const createExampleBenchmarks = async (options: InitOptions): Promise<void> => {
  if (!options.quiet) {
    console.log('Creating example benchmarks...');
  }

  const benchmarksDir = resolve(options.cwd, 'benchmarks');

  for (const [name, example] of Object.entries(EXAMPLE_BENCHMARKS)) {
    const filePath = join(benchmarksDir, example.filename);

    try {
      await writeFile(filePath, example.content, 'utf8');
      if (options.verbose) {
        console.log(`  ✓ ${example.filename}`);
      }
    } catch (error) {
      throw new InvalidArgumentError(
        `Failed to create example ${name}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
};

/**
 * Generate simple YAML from object (basic implementation)
 */
const generateSimpleYaml = (obj: any, indent = 0): string => {
  const spaces = ' '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n${generateSimpleYaml(value, indent + 2)}`;
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        yaml += `${spaces}  - ${item}\n`;
      }
    } else {
      const formattedValue = typeof value === 'string' ? `"${value}"` : value;
      yaml += `${spaces}${key}: ${formattedValue}\n`;
    }
  }

  return yaml;
};
