/**
 * Basic node:test fixture for adapter E2E testing
 */
import {
  describe,
  it,
  test,
  before,
  after,
  beforeEach,
  afterEach,
} from 'node:test';
import assert from 'node:assert';

// Track hook execution for verification
globalThis.__NODE_TEST_FIXTURE_HOOKS__ =
  globalThis.__NODE_TEST_FIXTURE_HOOKS__ || [];

describe('Math operations', () => {
  before(() => {
    globalThis.__NODE_TEST_FIXTURE_HOOKS__.push('before:Math');
  });

  after(() => {
    globalThis.__NODE_TEST_FIXTURE_HOOKS__.push('after:Math');
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

    it('should handle negative numbers', { skip: true }, () => {
      assert.strictEqual(-2 * 3, -6);
    });
  });
});

describe('String operations', () => {
  let testString;

  beforeEach(() => {
    testString = 'hello';
    globalThis.__NODE_TEST_FIXTURE_HOOKS__.push('beforeEach:String');
  });

  afterEach(() => {
    globalThis.__NODE_TEST_FIXTURE_HOOKS__.push('afterEach:String');
  });

  it('should concatenate strings', () => {
    assert.strictEqual(testString + ' world', 'hello world');
  });

  it('should get string length', () => {
    assert.strictEqual(testString.length, 5);
  });

  it('implement string reversal', { todo: true }, () => {
    // TODO: implement
  });
});
