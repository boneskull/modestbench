/**
 * Test fixture: Factory function that throws
 *
 * A factory function that throws an error during execution.
 */

const createReporter = (): never => {
  throw new Error('Factory explosion!');
};

export default createReporter;
