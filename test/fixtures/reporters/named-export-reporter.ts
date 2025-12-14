/**
 * Test fixture: Reporter with named export (no default)
 *
 * A reporter that only has named exports, no default export. This should fail
 * because we require default exports.
 */

import type { Reporter } from '../../../src/types/index.js';

export const reporter: Reporter = {
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
