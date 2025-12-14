/**
 * Test fixture: Invalid reporter with missing methods
 *
 * A reporter plugin that doesn't implement all required methods.
 */

const reporter = {
  onEnd(_run: unknown) {
    // no-op
  },
  onStart(_run: unknown) {
    // no-op
  },
  // Missing: onError, onTaskResult
};

export default reporter;
