/**
 * ModestBench Init Command
 *
 * Initialize a new benchmark project with configuration files, directory
 * structure, and optional example benchmark files.
 */

import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { type Argv } from 'yargs';

import type { CliContext } from '../index.js';

/**
 * Init command arguments interface
 */
interface InitArguments {
  configType: 'js' | 'json' | 'ts' | 'yaml';
  cwd: string;
  examples: boolean;
  force?: boolean;
  quiet?: boolean;
  type: 'advanced' | 'basic' | 'library';
  verbose?: boolean;
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
      reporters: ['human', 'json', 'csv'],
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

export const initCommand = {
  builder: (yargs: Argv) => {
    return yargs
      .positional('type', {
        choices: ['basic', 'advanced', 'library'],
        default: 'basic',
        describe: 'Type of project to initialize',
        type: 'string',
      })
      .option('examples', {
        default: true,
        description: 'Include example benchmark files',
        type: 'boolean',
      })
      .option('config-type', {
        choices: ['json', 'yaml', 'js', 'ts'],
        default: 'json',
        description: 'Configuration file format',
        type: 'string',
      })
      .option('force', {
        default: false,
        description: 'Overwrite existing files',
        type: 'boolean',
      })
      .example([
        ['$0 init', 'Initialize a basic project'],
        [
          '$0 init advanced --config ts',
          'Initialize advanced project with TypeScript config',
        ],
        [
          '$0 init library --no-examples',
          'Initialize library project without examples',
        ],
      ]);
  },

  handler: async (
    context: CliContext,
    argv: InitArguments,
  ): Promise<number> => {
    try {
      const template = PROJECT_TEMPLATES[argv.type];

      if (!argv.quiet) {
        console.log(`Initializing ${template.name}...`);
        console.log(template.description);
        console.log();
      }

      // Check if project already exists
      if (!argv.force) {
        const hasConflicts = await checkForConflicts(argv);
        if (hasConflicts) {
          console.error(
            'Project files already exist. Use --force to overwrite.',
          );
          return 1; // Already initialized
        }
      }

      // Create directory structure
      await createDirectories(template.directories, argv);

      // Create configuration file
      await createConfigFile(template.configOptions, argv);

      // Create example benchmarks if requested
      if (argv.examples) {
        await createExampleBenchmarks(argv);
      }

      // Create additional files
      await createAdditionalFiles(argv);

      if (!argv.quiet) {
        console.log('✅ Project initialized successfully!');
        console.log();
        console.log('Next steps:');
        if (argv.examples) {
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

      if (argv.verbose && error instanceof Error && error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
      }

      return 5; // Runtime error
    }
  },
};

/**
 * Check for existing files that would conflict
 */
const checkForConflicts = async (argv: InitArguments): Promise<boolean> => {
  const filesToCheck = ['modestbench.config.' + argv.configType, 'benchmarks'];

  for (const file of filesToCheck) {
    try {
      await access(resolve(argv.cwd, file));
      return true; // File exists, conflict detected
    } catch {
      // File doesn't exist, no conflict
    }
  }

  return false;
};

/**
 * Create additional project files
 */
const createAdditionalFiles = async (argv: InitArguments): Promise<void> => {
  if (!argv.quiet) {
    console.log('Creating additional files...');
  }

  // Create .gitignore
  const gitignoreContent = `# ModestBench
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
    const gitignorePath = resolve(argv.cwd, '.gitignore');
    await writeFile(gitignorePath, gitignoreContent, 'utf8');
    if (argv.verbose) {
      console.log('  ✓ .gitignore');
    }
  } catch {
    // Non-critical, just warn
    console.warn('Warning: Could not create .gitignore file');
  }

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
    const readmePath = resolve(argv.cwd, 'README.md');
    await writeFile(readmePath, readmeContent, 'utf8');
    if (argv.verbose) {
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
  argv: InitArguments,
): Promise<void> => {
  const filename = `modestbench.config.${argv.configType}`;
  const filePath = resolve(argv.cwd, filename);

  if (!argv.quiet) {
    console.log(`Creating configuration file: ${filename}`);
  }

  let content: string;

  switch (argv.configType) {
    case 'js':
      content = `module.exports = ${JSON.stringify(configOptions, null, 2)};\\n`;
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
      throw new Error(`Unsupported config format: ${argv.configType}`);
  }

  try {
    await writeFile(filePath, content, 'utf8');
    if (argv.verbose) {
      console.log(`  ✓ ${filename}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to create config file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Create directory structure
 */
const createDirectories = async (
  directories: readonly string[],
  argv: InitArguments,
): Promise<void> => {
  if (!argv.quiet) {
    console.log('Creating directories...');
  }

  for (const dir of directories) {
    const dirPath = resolve(argv.cwd, dir);
    try {
      await mkdir(dirPath, { recursive: true });
      if (argv.verbose) {
        console.log(`  ✓ ${dir}/`);
      }
    } catch (error) {
      throw new Error(
        `Failed to create directory ${dir}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
};

/**
 * Create example benchmark files
 */
const createExampleBenchmarks = async (argv: InitArguments): Promise<void> => {
  if (!argv.quiet) {
    console.log('Creating example benchmarks...');
  }

  const benchmarksDir = resolve(argv.cwd, 'benchmarks');

  for (const [name, example] of Object.entries(EXAMPLE_BENCHMARKS)) {
    const filePath = join(benchmarksDir, example.filename);

    try {
      await writeFile(filePath, example.content, 'utf8');
      if (argv.verbose) {
        console.log(`  ✓ ${example.filename}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to create example ${name}: ${error instanceof Error ? error.message : String(error)}`,
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

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\\n${generateSimpleYaml(value, indent + 2)}`;
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\\n`;
      for (const item of value) {
        yaml += `${spaces}  - ${item}\\n`;
      }
    } else {
      const formattedValue = typeof value === 'string' ? `"${value}"` : value;
      yaml += `${spaces}${key}: ${formattedValue}\\n`;
    }
  }

  return yaml;
};
