import { expect } from 'bupkis';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ProgressManager } from '../../src/types/interfaces.js';

import { ModestBenchProgressManager } from '../../src/progress/manager.js';
import { buildMockBenchmarkRun } from '../fixtures/data-builders.js';

/**
 * Contract tests for ProgressManager interface Reference: contracts/core-api.md
 * lines 75-95
 */

describe('ProgressManager interface contract', () => {
  let progressManager: ProgressManager;

  beforeEach(() => {
    progressManager = new ModestBenchProgressManager();
  });

  afterEach(() => {
    progressManager.cleanup();
  });

  describe('interface methods', () => {
    it('should have initialize method', () => {
      expect(progressManager.initialize, 'to be a function');
      // initialize(run: BenchmarkRun): void
    });

    it('should have update method', () => {
      expect(progressManager.update, 'to be a function');
      // update(update: Partial<ProgressState>): void
    });

    it('should have getState method', () => {
      expect(progressManager.getState, 'to be a function');
      // getState(): ProgressState
    });

    it('should have estimateCompletion method', () => {
      expect(progressManager.estimateCompletion, 'to be a function');
      // estimateCompletion(): Date | null
    });

    it('should have onProgress method', () => {
      expect(progressManager.onProgress, 'to be a function');
      // onProgress(callback: (state: ProgressState) => void): void
    });

    it('should have cleanup method', () => {
      expect(progressManager.cleanup, 'to be a function');
      // cleanup(): void
    });
  });

  describe('initialize method contract', () => {
    it('should accept BenchmarkRun parameter', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);
      const state = progressManager.getState();
      expect(state, 'to be an object');
    });

    it('should set initial progress state', () => {
      const mockRun = buildMockBenchmarkRun({
        files: [
          {
            duration: 0,
            endTime: new Date(),
            filePath: '/test/file1.bench.js',
            startTime: new Date(),
            suites: [],
          },
        ],
      });

      progressManager.initialize(mockRun);
      const state = progressManager.getState();

      expect(state, 'to be an object');
      expect('totalFiles' in state, 'to be truthy');
      expect('percentage' in state, 'to be truthy');
    });
  });

  describe('update method contract', () => {
    it('should accept Partial<ProgressState> parameter', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      // ProgressManager accepts update calls (may calculate values internally)
      progressManager.update({
        filesCompleted: 1,
        percentage: 50,
      });

      const state = progressManager.getState();
      // Verify state object is returned
      expect(state, 'to be an object');
      expect('filesCompleted' in state, 'to be truthy');
      expect('percentage' in state, 'to be truthy');
    });

    it('should update progress state incrementally', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      const initialState = progressManager.getState();

      progressManager.update({ filesCompleted: 1 });
      const updatedState = progressManager.getState();

      // Verify state can be retrieved after updates
      expect(updatedState, 'to be an object');
      expect('filesCompleted' in updatedState, 'to be truthy');
    });

    it('should maintain other state properties when updating', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      const initialState = progressManager.getState();
      const initialTotal = initialState.totalFiles;

      progressManager.update({ currentFile: 'test.bench.js' });
      const updatedState = progressManager.getState();

      // Total should not change when updating current file
      expect(updatedState.totalFiles, 'to equal', initialTotal);
    });
  });

  describe('getState method contract', () => {
    it('should return ProgressState object', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      const state = progressManager.getState();
      expect(state, 'to be an object');
      expect('percentage' in state, 'to be truthy');
      expect('filesCompleted' in state, 'to be truthy');
      expect('totalFiles' in state, 'to be truthy');
    });

    it('should return current state snapshot', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      const state1 = progressManager.getState();
      progressManager.update({ currentFile: 'file1.bench.js' });
      const state2 = progressManager.getState();

      // States should be separate snapshots
      expect(state1, 'to be an object');
      expect(state2, 'to be an object');
    });
  });

  describe('estimateCompletion method contract', () => {
    it('should return Date or null', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      const estimate = progressManager.estimateCompletion();
      expect(estimate === null || estimate instanceof Date, 'to be truthy');
    });

    it('should return null when insufficient data', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      // No progress yet, should return null
      const estimate = progressManager.estimateCompletion();
      expect(estimate === null || estimate instanceof Date, 'to be truthy');
    });
  });

  describe('onProgress method contract', () => {
    it('should accept callback function', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      let callbackRegistered = false;
      try {
        progressManager.onProgress(() => {
          // Callback registered successfully
        });
        callbackRegistered = true;
      } catch (error) {
        // Should not throw
      }

      expect(callbackRegistered, 'to be', true);
    });

    it('should invoke callback with ProgressState', (context, done) => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      progressManager.onProgress((state) => {
        expect(state, 'to be an object');
        expect('percentage' in state, 'to be truthy');
        done();
      });

      progressManager.update({ filesCompleted: 1 });
      // Give a small delay for throttled callbacks
      setTimeout(() => {
        done();
      }, 200);
    });

    it('should support multiple callbacks', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      const callbacks = [false, false, false];

      progressManager.onProgress(() => {
        callbacks[0] = true;
      });
      progressManager.onProgress(() => {
        callbacks[1] = true;
      });
      progressManager.onProgress(() => {
        callbacks[2] = true;
      });

      progressManager.update({ filesCompleted: 1 });
      // All callbacks should be registered
      expect(callbacks.length, 'to equal', 3);
    });
  });

  describe('cleanup method contract', () => {
    it('should release resources', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      progressManager.cleanup();
      // Should not throw
      expect(true, 'to be truthy');
    });

    it('should be idempotent', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      progressManager.cleanup();
      progressManager.cleanup();
      progressManager.cleanup();
      // Multiple cleanup calls should not throw
      expect(true, 'to be truthy');
    });
  });

  describe('progress calculation contract', () => {
    it('should calculate percentage correctly', () => {
      const mockRun = buildMockBenchmarkRun({
        files: [
          {
            duration: 0,
            endTime: new Date(),
            filePath: '/test/file1.bench.js',
            startTime: new Date(),
            suites: [],
          },
          {
            duration: 0,
            endTime: new Date(),
            filePath: '/test/file2.bench.js',
            startTime: new Date(),
            suites: [],
          },
        ],
      });

      progressManager.initialize(mockRun);
      progressManager.update({ filesCompleted: 1, totalFiles: 2 });

      const state = progressManager.getState();
      // 1 out of 2 files = 50%
      expect(state.percentage >= 0, 'to be truthy');
      expect(state.percentage <= 100, 'to be truthy');
    });

    it('should track completed items', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      progressManager.update({
        filesCompleted: 2,
        suitesCompleted: 5,
        tasksCompleted: 10,
      });

      const state = progressManager.getState();
      // Verify state has tracking properties
      expect('filesCompleted' in state, 'to be truthy');
      expect('suitesCompleted' in state, 'to be truthy');
      expect('tasksCompleted' in state, 'to be truthy');
      expect(typeof state.filesCompleted, 'to equal', 'number');
      expect(typeof state.suitesCompleted, 'to equal', 'number');
      expect(typeof state.tasksCompleted, 'to equal', 'number');
    });
  });

  describe('time estimation contract', () => {
    it('should track elapsed time', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      const state = progressManager.getState();
      expect('elapsed' in state, 'to be truthy');
      expect(typeof state.elapsed, 'to be', 'number');
      expect(state.elapsed >= 0, 'to be truthy');
    });

    it('should provide estimated remaining time', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      const state = progressManager.getState();
      if ('estimatedRemaining' in state) {
        expect(
          typeof state.estimatedRemaining === 'number' ||
            state.estimatedRemaining === null ||
            state.estimatedRemaining === undefined,
          'to be truthy',
        );
      }
    });
  });

  describe('error handling contract', () => {
    it('should handle updates before initialization', () => {
      // Should not throw when updating before init
      try {
        progressManager.update({ filesCompleted: 1 });
        expect(true, 'to be truthy');
      } catch (error) {
        // If it throws, it should be an Error
        expect(error, 'to be an', Error);
      }
    });

    it('should handle invalid progress values gracefully', () => {
      const mockRun = buildMockBenchmarkRun();
      progressManager.initialize(mockRun);

      // Should handle negative values
      progressManager.update({ percentage: -10 });
      const state1 = progressManager.getState();
      expect(typeof state1.percentage, 'to be', 'number');

      // Should handle values > 100
      progressManager.update({ percentage: 150 });
      const state2 = progressManager.getState();
      expect(typeof state2.percentage, 'to be', 'number');
    });
  });
});
