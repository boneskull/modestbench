/**
 * Test fixture: Reporter with optional methods
 *
 * A reporter that implements both required and optional methods.
 */

import type { Reporter } from '../../../src/types/index.js';

const reporter: Reporter = {
  // Optional methods
  onBudgetResult(_summary) {
    // no-op
  },
  // Required methods
  onEnd(_run) {
    // no-op
  },
  onError(_error) {
    // no-op
  },
  onFileEnd(_result) {
    // no-op
  },
  onFileStart(_file) {
    // no-op
  },
  onProgress(_state) {
    // no-op
  },
  onStart(_run) {
    // no-op
  },
  onSuiteEnd(_result) {
    // no-op
  },

  onSuiteInit(_suite, _taskNames) {
    // no-op
  },
  onSuiteStart(_suite) {
    // no-op
  },
  onTaskResult(_result) {
    // no-op
  },
  onTaskStart(_task) {
    // no-op
  },
};

export default reporter;
