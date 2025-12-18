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
  DEFAULT_BENCHMARK_DIR,
  DEFAULT_OUTPUT_DIR,
  SITE_URL,
} from '../../constants.js';
import {
  InvalidArgumentError,
  UnsupportedConfigFormatError,
} from '../../errors/index.js';

/**
 * Init command options interface
 */
interface InitOptions {
  configType?: 'js' | 'json' | 'ts' | 'yaml';
  cwd?: string;
  examples?: boolean;
  force?: boolean | undefined;
  quiet?: boolean | undefined;
  type?: 'advanced' | 'basic' | 'library';
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
      outputDir: DEFAULT_OUTPUT_DIR,
      pattern: `${DEFAULT_BENCHMARK_DIR}/**/*.bench.{js,ts}`,
      reporters: ['human', 'json'],
      time: 10_000,
      warmup: 50,
    },
    description: 'Feature-rich setup with multiple reporters and configuration',
    directories: [DEFAULT_BENCHMARK_DIR, DEFAULT_OUTPUT_DIR],
    name: 'Advanced Project',
  },
  basic: {
    configOptions: {
      iterations: 100,
      outputDir: DEFAULT_OUTPUT_DIR,
      pattern: `${DEFAULT_BENCHMARK_DIR}/**/*.bench.{js,ts}`,
      reporters: ['human'],
      time: 5000,
    },
    description: 'Simple benchmark setup for small projects',
    directories: [DEFAULT_BENCHMARK_DIR, DEFAULT_OUTPUT_DIR],
    name: 'Basic Project',
  },
  library: {
    configOptions: {
      bail: false,
      iterations: 5000,
      outputDir: DEFAULT_OUTPUT_DIR,
      pattern: `${DEFAULT_BENCHMARK_DIR}/**/*.bench.{js,ts}`,
      reporters: ['human', 'json'],
      time: 15_000,
      warmup: 100,
    },
    description: 'Optimized for library performance testing',
    directories: [
      DEFAULT_BENCHMARK_DIR,
      `${DEFAULT_BENCHMARK_DIR}/suites`,
      DEFAULT_OUTPUT_DIR,
    ],
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
const _promptUser = async (question: string): Promise<boolean> => {
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
    // Apply defaults for required options
    const type = options.type ?? 'basic';
    const cwd = options.cwd ?? process.cwd();
    const configType = options.configType ?? 'json';
    const examples = options.examples ?? false;

    const template = PROJECT_TEMPLATES[type];

    if (!options.quiet) {
      console.log(`Initializing ${template.name}...`);
      console.log(template.description);
      console.log();
    }

    // Check if project already exists
    if (!options.force) {
      const hasConflicts = await checkForConflicts(cwd, configType);
      if (hasConflicts) {
        console.error('Project files already exist. Use --force to overwrite.');
        return 1; // Already initialized
      }
    }

    // Create directory structure
    await createDirectories(template.directories, cwd);

    // Create configuration file
    await createConfigFile(template.configOptions, cwd, configType);

    // Create example benchmarks if requested
    if (examples) {
      await createExampleBenchmarks(cwd);
    }

    // Create additional files
    await createAdditionalFiles(cwd, {
      quiet: options.quiet,
      yes: options.yes,
    });

    if (!options.quiet) {
      console.log('✅ Project initialized successfully!');
      console.log();
      console.log('Next steps:');
      if (examples) {
        console.log('  1. Run example benchmarks: modestbench run');
      } else {
        console.log(
          '  1. Create your first benchmark file in the bench/ directory',
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
const checkForConflicts = async (
  cwd: string,
  configType: string,
): Promise<boolean> => {
  const filesToCheck = ['modestbench.config.' + configType, 'benchmarks'];

  for (const file of filesToCheck) {
    try {
      await access(resolve(cwd, file));
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
const createAdditionalFiles = async (
  cwd: string,
  options?: { quiet?: boolean; yes?: boolean },
): Promise<void> => {
  // Create README.md
  const readmeContent = `# Benchmark Project

This project uses [ModestBench](${SITE_URL}) for performance testing.

## Getting Started

Run all benchmarks:
\`\`\`bash
modestbench run
\`\`\`

Run specific benchmarks:
\`\`\`bash
modestbench run "${DEFAULT_BENCHMARK_DIR}/array-*.bench.js"
\`\`\`

View benchmark history:
\`\`\`bash
modestbench history list
\`\`\`

## Configuration

See \`modestbench.config.*\` for benchmark configuration options.

## Writing Benchmarks

Create new benchmark files in the \`${DEFAULT_BENCHMARK_DIR}/\` directory. See the examples for the expected format.
`;

  try {
    const readmePath = resolve(cwd, 'README.md');
    await writeFile(readmePath, readmeContent, 'utf8');
  } catch {
    // Non-critical, just warn
    console.warn('Warning: Could not create README.md file');
  }

  // Create or update .gitignore
  await createOrUpdateGitignore(cwd, options);
};

/**
 * Create or update .gitignore file to include ModestBench directories
 */
const createOrUpdateGitignore = async (
  cwd: string,
  options?: { quiet?: boolean; yes?: boolean },
): Promise<void> => {
  const gitignorePath = resolve(cwd, '.gitignore');
  const modestbenchEntry = `${DEFAULT_OUTPUT_DIR}/`;
  const modestbenchSection = `\n# ModestBench history\n${modestbenchEntry}\n`;

  try {
    // Check if .gitignore exists
    let existingContent = '';
    try {
      existingContent = await readFile(gitignorePath, 'utf8');
    } catch {
      // File doesn't exist, will create new one
    }

    if (existingContent) {
      // File exists, check if ${DEFAULT_OUTPUT_DIR}/ is already present
      if (existingContent.includes(modestbenchEntry)) {
        // Already present, nothing to do
        return;
      }

      // Append default output dir entry (--yes or --quiet means auto-accept)
      if (options?.yes || options?.quiet) {
        // Ensure content ends with newline
        const contentToAppend = existingContent.endsWith('\n')
          ? modestbenchSection
          : `\n${modestbenchSection}`;
        await appendFile(gitignorePath, contentToAppend, 'utf8');
      }
    } else {
      // Create new .gitignore with common entries
      const newContent = `# Dependencies
node_modules/

# Build output
dist/
build/
*.log

# Test coverage
coverage/

# Benchmark output
${modestbenchSection}`;
      await writeFile(gitignorePath, newContent, 'utf8');
    }
  } catch {
    // Non-critical, just warn
    console.warn('Warning: Could not create/update .gitignore file');
  }
};

/**
 * Create configuration file
 */
const createConfigFile = async (
  configOptions: any,
  cwd: string,
  configType: string,
): Promise<void> => {
  const filename = `modestbench.config.${configType}`;
  const filePath = resolve(cwd, filename);

  let content: string;

  switch (configType) {
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
        `Unsupported config format: ${configType}`,
      );
  }

  try {
    await writeFile(filePath, content, 'utf8');
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
  cwd: string,
): Promise<void> => {
  for (const dir of directories) {
    const dirPath = resolve(cwd, dir);
    try {
      await mkdir(dirPath, { recursive: true });
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
const createExampleBenchmarks = async (cwd: string): Promise<void> => {
  const benchmarksDir = resolve(cwd, DEFAULT_BENCHMARK_DIR);

  for (const [name, example] of Object.entries(EXAMPLE_BENCHMARKS)) {
    const filePath = join(benchmarksDir, example.filename);

    try {
      await writeFile(filePath, example.content, 'utf8');
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
