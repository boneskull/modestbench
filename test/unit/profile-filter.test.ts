import { expect } from 'bupkis';
import { describe, it } from 'node:test';

import type {
  ProfileConfig,
  RawProfileData,
} from '../../src/types/profiler.js';

import { filterProfile } from '../../src/services/profiler/profile-filter.js';

describe('ProfileFilter', () => {
  const mockData: RawProfileData = {
    functions: [
      {
        category: 'JavaScript',
        file: '/Users/test/my_project/src/utils.js',
        line: 42,
        name: 'sortArray',
        percentage: 10.0,
        ticks: 100,
      },
      {
        category: 'JavaScript',
        file: 'node:internal/modules/cjs/loader',
        line: null,
        name: 'require',
        percentage: 5.0,
        ticks: 50,
      },
      {
        category: 'JavaScript',
        file: '/Users/test/my_project/node_modules/lodash/index.js',
        line: 1,
        name: 'lodash',
        percentage: 8.0,
        ticks: 80,
      },
      {
        category: 'JavaScript',
        file: '/Users/test/my_project/src/parser.js',
        line: 15,
        name: 'parseInput',
        percentage: 3.0,
        ticks: 30,
      },
    ],
    logPath: '/path/to/log',
    summary: {
      cppTicks: 150,
      gcTicks: 50,
      javascriptTicks: 800,
      sharedLibraryTicks: 0,
      totalTicks: 1000,
    },
    totalTicks: 1000,
  };

  it('should filter to user code with smart detection', () => {
    const config: ProfileConfig = {
      minExecutionPercent: 0,
      smartDetection: true,
      topN: 100,
    };

    const result = filterProfile(mockData, config, '/Users/test/my_project');

    expect(result.functions.length, 'to equal', 2);
    expect(result.functions[0]!.name, 'to equal', 'sortArray');
    expect(result.functions[1]!.name, 'to equal', 'parseInput');
  });

  it('should filter by minimum percentage', () => {
    const config: ProfileConfig = {
      minExecutionPercent: 5.0,
      smartDetection: true,
      topN: 100,
    };

    const result = filterProfile(mockData, config, '/Users/test/my_project');

    expect(result.functions.length, 'to equal', 1);
    expect(result.functions[0]!.name, 'to equal', 'sortArray');
  });

  it('should respect topN limit', () => {
    const config: ProfileConfig = {
      minExecutionPercent: 0,
      smartDetection: true,
      topN: 1,
    };

    const result = filterProfile(mockData, config, '/Users/test/my_project');

    expect(result.functions.length, 'to equal', 1);
    expect(result.functions[0]!.name, 'to equal', 'sortArray');
  });

  it('should filter by focus patterns', () => {
    const config: ProfileConfig = {
      focus: ['**/utils.js'],
      minExecutionPercent: 0,
      topN: 100,
    };

    const result = filterProfile(mockData, config, '/Users/test/my_project');

    expect(result.functions.length, 'to equal', 1);
    expect(result.functions[0]!.name, 'to equal', 'sortArray');
  });

  it('should filter by exclude patterns', () => {
    const config: ProfileConfig = {
      exclude: ['**/parser.js'],
      minExecutionPercent: 0,
      smartDetection: true,
      topN: 100,
    };

    const result = filterProfile(mockData, config, '/Users/test/my_project');

    expect(result.functions.length, 'to equal', 1);
    expect(result.functions[0]!.name, 'to equal', 'sortArray');
  });

  it('should group by file when requested', () => {
    const config: ProfileConfig = {
      groupByFile: true,
      minExecutionPercent: 0,
      smartDetection: true,
      topN: 100,
    };

    const result = filterProfile(mockData, config, '/Users/test/my_project');

    expect(result.groupedByFile, 'to be defined');
    expect(result.groupedByFile?.size, 'to equal', 2);

    const utilsFunctions = result.groupedByFile?.get(
      '/Users/test/my_project/src/utils.js',
    );
    expect(utilsFunctions?.length, 'to equal', 1);
    expect(utilsFunctions?.[0]!.name, 'to equal', 'sortArray');
  });

  it('should sort functions by percentage descending', () => {
    const config: ProfileConfig = {
      minExecutionPercent: 0,
      smartDetection: true,
      topN: 100,
    };

    const result = filterProfile(mockData, config, '/Users/test/my_project');

    expect(result.functions.length, 'to be greater than', 1);
    expect(
      result.functions[0]!.percentage,
      'to be greater than',
      result.functions[1]!.percentage,
    );
  });
});
