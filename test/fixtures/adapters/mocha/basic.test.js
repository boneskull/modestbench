/**
 * Basic Mocha test fixture for adapter E2E testing
 *
 * Note: The Mocha adapter uses global injection, not ESM loader hooks. So we
 * use the globals (describe, it, etc.) directly instead of importing from
 * 'mocha'.
 */
import assert from 'node:assert';

/* global describe, it, before, after, beforeEach, afterEach */

// Track hook execution for verification
globalThis.__MOCHA_FIXTURE_HOOKS__ = globalThis.__MOCHA_FIXTURE_HOOKS__ || [];

describe('Math operations', () => {
  before(() => {
    globalThis.__MOCHA_FIXTURE_HOOKS__.push('before:Math');
  });

  after(() => {
    globalThis.__MOCHA_FIXTURE_HOOKS__.push('after:Math');
  });

  it('should add two numbers', () => {
    assert.strictEqual(1 + 1, 2);
  });

  it('should subtract two numbers', () => {
    assert.strictEqual(5 - 3, 2);
  });

  describe('multiplication', () => {
    it('should multiply two numbers', () => {
      assert.strictEqual(2 * 3, 6);
    });

    it.skip('should handle negative numbers', () => {
      assert.strictEqual(-2 * 3, -6);
    });
  });
});

describe('String operations', () => {
  let testString;

  beforeEach(() => {
    testString = 'hello';
    globalThis.__MOCHA_FIXTURE_HOOKS__.push('beforeEach:String');
  });

  afterEach(() => {
    globalThis.__MOCHA_FIXTURE_HOOKS__.push('afterEach:String');
  });

  it('should concatenate strings', () => {
    assert.strictEqual(testString + ' world', 'hello world');
  });

  it('should get string length', () => {
    assert.strictEqual(testString.length, 5);
  });
});
