/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { expect } from 'bupkis';
import { after, before, describe, it } from 'node:test';

import type { BenchmarkRun, ProgressState } from '../../src/types/index.js';

import { ModestBenchProgressManager } from '../../src/progress/manager.js';

// Time mocking utilities for throttle bypass
let mockTime = Date.now();
let originalDateNow: typeof Date.now;

const setupTimeMocking = (): void => {
  mockTime = Date.now();
  originalDateNow = Date.now;
  (Date as any).now = () => mockTime;
};

const teardownTimeMocking = (): void => {
  (Date as any).now = originalDateNow;
};

const advanceTime = (ms: number): void => {
  mockTime += ms;
};

// Helper to create a minimal benchmark run for testing
const createMockRun = (
  totalFiles = 1,
  totalSuites = 1,
  totalTasks = 10,
): BenchmarkRun => ({
  config: {} as any,
  duration: 0,
  endTime: new Date(),
  environment: {
    arch: 'x64',
    availableMemory: 1000000,
    cpu: { cores: 4, model: 'Test CPU', speed: 2000 },
    env: {},
    hostname: 'test',
    memory: { free: 500000, total: 1000000, used: 500000 },
    nodeVersion: 'v20.0.0',
    platform: 'linux',
  },
  files: [],
  id: 'test-run',
  startTime: new Date(),
  summary: {
    failedTasks: 0,
    fastest: null,
    overallMean: 0,
    passedTasks: 0,
    slowest: null,
    totalFiles,
    totalOperations: 0,
    totalSuites,
    totalTasks,
  },
});

describe('ModestBenchProgressManager', () => {
  before(() => {
    setupTimeMocking();
  });

  after(() => {
    teardownTimeMocking();
  });

  describe('percentage calculation', () => {
    it('should calculate 0% when no tasks completed', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      const state = manager.getState();
      expect(state.percentage, 'to equal', 0);
    });

    it('should calculate 50% when half tasks completed', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      advanceTime(100); // Advance past throttle time
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 5 });

      const state = manager.getState();
      expect(state.percentage, 'to equal', 50);
    });

    it('should calculate 100% when all tasks completed', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      advanceTime(100); // Advance past throttle time
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 10 });

      const state = manager.getState();
      expect(state.percentage, 'to equal', 100);
    });

    it('should return 0% when totalTasks is 0', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(0, 0, 0));

      const state = manager.getState();
      expect(state.percentage, 'to equal', 0);
    });

    it('should clamp percentage between 0 and 100', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      advanceTime(100); // Advance past throttle time
      // Try to set more than 100%
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 15 });

      const state = manager.getState();
      expect(state.percentage, 'to be less than or equal to', 100);
      expect(state.percentage, 'to be greater than or equal to', 0);
    });

    it('should calculate fractional percentages correctly', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 3));

      advanceTime(100); // Advance past throttle time
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 1 });

      const state = manager.getState();
      expect(state.percentage, 'to be close to', 33.33, 0.01);
    });
  });

  describe('throughput calculation', () => {
    it('should return 0 when no throughput data available', () => {
      const manager = new ModestBenchProgressManager();
      const throughput = (manager as any).calculateThroughput();

      expect(throughput, 'to equal', 0);
    });

    it('should calculate average from recent timings', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 100));

      // Simulate some progress
      (manager as any).metrics.recentTimings = [10, 20, 30];

      const throughput = (manager as any).calculateThroughput();
      expect(throughput, 'to equal', 20); // (10 + 20 + 30) / 3
    });

    it('should use only recent timings (moving average)', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 100));

      // Fill with recent timings
      (manager as any).metrics.recentTimings = [5, 10, 15];

      const throughput = (manager as any).calculateThroughput();
      expect(throughput, 'to equal', 10); // (5 + 10 + 15) / 3
    });
  });

  describe('time estimation', () => {
    it('should return null when no progress data', () => {
      const manager = new ModestBenchProgressManager();
      const estimate = manager.estimateCompletion();

      expect(estimate, 'to be null');
    });

    it('should return null when no tasks completed', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      const estimate = manager.estimateCompletion();

      expect(estimate, 'to be null');
    });

    it('should return future Date based on throughput', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 100));

      // Set up metrics to enable estimation
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 50 });
      (manager as any).metrics.recentTimings = [10]; // 10 tasks per second

      const estimate = manager.estimateCompletion();

      expect(estimate, 'not to be null');
      expect(estimate instanceof Date, 'to be true');
    });

    it('should return current time when already complete', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 10 });
      (manager as any).metrics.recentTimings = [10];

      const estimate = manager.estimateCompletion();

      expect(estimate, 'not to be null');
      if (estimate) {
        const now = Date.now();
        expect(Math.abs(estimate.getTime() - now), 'to be less than', 1000);
      }
    });

    it('should return null when throughput is 0', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 100));

      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 10 });
      (manager as any).metrics.recentTimings = [0];

      const estimate = manager.estimateCompletion();

      expect(estimate, 'to be null');
    });
  });

  describe('time formatting', () => {
    it('should format seconds correctly', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());
      (manager as any).state.elapsed = 42000; // 42 seconds in ms

      const formatted = manager.getFormattedElapsed();

      expect(formatted, 'to equal', '42s');
    });

    it('should format minutes and seconds correctly', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());
      (manager as any).state.elapsed = 330000; // 5m 30s

      const formatted = manager.getFormattedElapsed();

      expect(formatted, 'to equal', '5m 30s');
    });

    it('should format hours, minutes, and seconds correctly', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());
      (manager as any).state.elapsed = 8145000; // 2h 15m 45s

      const formatted = manager.getFormattedElapsed();

      expect(formatted, 'to equal', '2h 15m 45s');
    });

    it('should handle 0 seconds', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());
      (manager as any).state.elapsed = 0;

      const formatted = manager.getFormattedElapsed();

      expect(formatted, 'to equal', '0s');
    });

    it('should handle very large values', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());
      (manager as any).state.elapsed = 36000000; // 10 hours

      const formatted = manager.getFormattedElapsed();

      expect(formatted, 'to contain', 'h');
    });

    it('should format exactly 1 minute as 1m 0s', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());
      (manager as any).state.elapsed = 60000; // 1 minute

      const formatted = manager.getFormattedElapsed();

      expect(formatted, 'to equal', '1m 0s');
    });
  });

  describe('estimate formatting', () => {
    it('should return null when no estimate available', () => {
      const manager = new ModestBenchProgressManager();
      const formatted = manager.getFormattedEstimate();

      expect(formatted, 'to be null');
    });

    it('should return "Complete" when done', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 10 });
      (manager as any).metrics.recentTimings = [10];

      const formatted = manager.getFormattedEstimate();

      expect(formatted, 'to equal', 'Complete');
    });

    it('should format remaining seconds', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 100));
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 50 });

      // Mock the estimateCompletion to return a specific time
      const futureTime = new Date(Date.now() + 45000); // 45 seconds from now
      manager.estimateCompletion = () => futureTime;

      const formatted = manager.getFormattedEstimate();

      expect(formatted, 'to match', /~\d+s remaining/);
    });

    it('should format remaining minutes', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 100));
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 50 });

      const futureTime = new Date(Date.now() + 150000); // 2m 30s from now
      manager.estimateCompletion = () => futureTime;

      const formatted = manager.getFormattedEstimate();

      expect(formatted, 'to match', /~\d+m \d+s remaining/);
    });

    it('should format remaining hours', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 100));
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 10 });

      const futureTime = new Date(Date.now() + 7200000); // 2 hours from now
      manager.estimateCompletion = () => futureTime;

      const formatted = manager.getFormattedEstimate();

      expect(formatted, 'to match', /~\d+h \d+m remaining/);
    });

    it('should handle negative remaining time gracefully', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      const pastTime = new Date(Date.now() - 1000); // 1 second ago
      manager.estimateCompletion = () => pastTime;

      const formatted = manager.getFormattedEstimate();

      expect(formatted, 'to equal', 'Complete');
    });
  });

  describe('state increment methods', () => {
    it('should increment files count', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(3, 1, 10));

      advanceTime(100); // Advance past throttle time
      manager.incrementFiles();

      const state = manager.getState();
      expect(state.filesCompleted, 'to equal', 1);
    });

    it('should increment suites count', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 5, 10));

      advanceTime(100); // Advance past throttle time
      manager.incrementSuites();

      const state = manager.getState();
      expect(state.suitesCompleted, 'to equal', 1);
    });

    it('should increment tasks count', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      advanceTime(100); // Advance past throttle time
      manager.incrementTasks();

      const state = manager.getState();
      expect(state.tasksCompleted, 'to equal', 1);
    });

    it('should update percentage when incrementing tasks', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      advanceTime(100); // Advance past throttle time
      manager.incrementTasks();
      advanceTime(100); // Advance past throttle time
      manager.incrementTasks();

      const state = manager.getState();
      expect(state.percentage, 'to equal', 20);
    });

    it('should allow multiple increments', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(3, 1, 10));

      advanceTime(100); // Advance past throttle time
      manager.incrementFiles();
      advanceTime(100); // Advance past throttle time
      manager.incrementFiles();
      advanceTime(100); // Advance past throttle time
      manager.incrementFiles();

      const state = manager.getState();
      expect(state.filesCompleted, 'to equal', 3);
    });
  });

  describe('callback management', () => {
    it('should register callbacks', () => {
      const manager = new ModestBenchProgressManager();
      let called = false;

      manager.onProgress(() => {
        called = true;
      });

      manager.initialize(createMockRun());

      expect(called, 'to be true');
    });

    it('should call callbacks with correct state', () => {
      const manager = new ModestBenchProgressManager();
      let receivedState: null | ProgressState = null;

      manager.onProgress((state) => {
        receivedState = state;
      });

      manager.initialize(createMockRun(1, 1, 10));

      expect(receivedState, 'not to be null');
      expect(receivedState!.totalTasks, 'to equal', 10);
      expect(receivedState!.tasksCompleted, 'to equal', 0);
    });

    it('should call multiple callbacks', () => {
      const manager = new ModestBenchProgressManager();
      let callCount1 = 0;
      let callCount2 = 0;

      manager.onProgress(() => {
        callCount1++;
      });
      manager.onProgress(() => {
        callCount2++;
      });

      manager.initialize(createMockRun());

      expect(callCount1, 'to be greater than', 0);
      expect(callCount2, 'to be greater than', 0);
    });

    it('should remove callbacks correctly', () => {
      const manager = new ModestBenchProgressManager();
      let callCount = 0;

      const callback = () => {
        callCount++;
      };

      manager.onProgress(callback);
      manager.initialize(createMockRun());

      const initialCallCount = callCount;

      const removed = manager.removeCallback(callback);
      expect(removed, 'to be true');

      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 1 });

      // Should not have been called again
      expect(callCount, 'to equal', initialCallCount);
    });

    it('should return false when removing non-existent callback', () => {
      const manager = new ModestBenchProgressManager();
      const callback = () => {};

      const removed = manager.removeCallback(callback);

      expect(removed, 'to be false');
    });

    it('should handle callback errors gracefully', () => {
      const manager = new ModestBenchProgressManager();
      let callCount = 0;

      manager.onProgress(() => {
        throw new Error('Callback error');
      });

      manager.onProgress(() => {
        callCount++;
      });

      // Should not throw
      manager.initialize(createMockRun());

      // Second callback should still be called
      expect(callCount, 'to be greater than', 0);
    });
  });

  describe('progress state management', () => {
    it('should initialize with run data', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(3, 5, 15));

      const state = manager.getState();

      expect(state.totalFiles, 'to equal', 3);
      expect(state.totalSuites, 'to equal', 5);
      expect(state.totalTasks, 'to equal', 15);
      expect(state.filesCompleted, 'to equal', 0);
      expect(state.suitesCompleted, 'to equal', 0);
      expect(state.tasksCompleted, 'to equal', 0);
    });

    it('should update state with partial updates', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      advanceTime(100); // Advance past throttle time
      manager.update({
        currentFile: 'test.bench.js',
        tasksCompleted: 5,
      });

      const state = manager.getState();

      expect(state.currentFile, 'to equal', 'test.bench.js');
      expect(state.tasksCompleted, 'to equal', 5);
      expect(state.totalTasks, 'to equal', 10); // Should preserve
    });

    it('should track current file, suite, and task', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());

      advanceTime(100); // Advance past throttle time
      manager.setCurrentFile('test.bench.js');
      advanceTime(100); // Advance past throttle time
      manager.setCurrentSuite('My Suite');
      advanceTime(100); // Advance past throttle time
      manager.setCurrentTask('my-task');

      const state = manager.getState();

      expect(state.currentFile, 'to equal', 'test.bench.js');
      expect(state.currentSuite, 'to equal', 'My Suite');
      expect(state.currentTask, 'to equal', 'my-task');
    });

    it('should track elapsed time', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());

      // Wait a bit (or simulate)
      const state = manager.getState();

      expect(state.elapsed, 'to be a number');
      expect(state.elapsed, 'to be greater than or equal to', 0);
    });

    it('should check if complete', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));

      expect(manager.isComplete(), 'to be false');

      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 10 });

      expect(manager.isComplete(), 'to be true');
    });

    it('should return false for isComplete when totalTasks is 0', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(0, 0, 0));

      expect(manager.isComplete(), 'to be false');
    });
  });

  describe('cleanup', () => {
    it('should clear callbacks on cleanup', () => {
      const manager = new ModestBenchProgressManager();
      let callCount = 0;

      manager.onProgress(() => {
        callCount++;
      });

      manager.initialize(createMockRun());
      const initialCount = callCount;

      manager.cleanup();
      manager.initialize(createMockRun());

      // Callback should not be called after cleanup
      expect(callCount, 'to equal', initialCount);
    });

    it('should reset state on cleanup', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun(1, 1, 10));
      advanceTime(100); // Advance past throttle time
      manager.update({ tasksCompleted: 5 });

      manager.cleanup();

      const state = manager.getState();

      expect(state.tasksCompleted, 'to equal', 0);
      expect(state.totalTasks, 'to equal', 0);
      expect(state.percentage, 'to equal', 0);
    });

    it('should clear metrics on cleanup', () => {
      const manager = new ModestBenchProgressManager();
      manager.initialize(createMockRun());

      manager.cleanup();

      const estimate = manager.estimateCompletion();
      expect(estimate, 'to be null');
    });
  });
});
