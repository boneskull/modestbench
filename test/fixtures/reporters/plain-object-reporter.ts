/**
 * Test fixture: Plain object reporter
 *
 * The simplest form of reporter plugin - a plain object with all required
 * methods.
 */

import type { Reporter } from '../../../src/types/index.js';

const reporter: Reporter = {
  onEnd(_run) {
    // no-op
  },
  onError(_error) {
    // no-op
  },
  onStart(_run) {
    // no-op
  },
  onTaskResult(_result) {
    // no-op
  },
};

export default reporter;
