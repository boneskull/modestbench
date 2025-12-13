/**
 * Basic Jest test fixture for adapter E2E testing
 */
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from '@jest/globals';

// Track hook execution for verification
globalThis.__JEST_FIXTURE_HOOKS__ = globalThis.__JEST_FIXTURE_HOOKS__ || [];

describe('Math operations', () => {
  beforeAll(() => {
    globalThis.__JEST_FIXTURE_HOOKS__.push('beforeAll:Math');
  });

  afterAll(() => {
    globalThis.__JEST_FIXTURE_HOOKS__.push('afterAll:Math');
  });

  test('should add two numbers', () => {
    expect(1 + 1).toBe(2);
  });

  test('should subtract two numbers', () => {
    expect(5 - 3).toBe(2);
  });

  describe('multiplication', () => {
    test('should multiply two numbers', () => {
      expect(2 * 3).toBe(6);
    });

    test.skip('should handle negative numbers', () => {
      expect(-2 * 3).toBe(-6);
    });
  });
});

describe('String operations', () => {
  let testString;

  beforeEach(() => {
    testString = 'hello';
    globalThis.__JEST_FIXTURE_HOOKS__.push('beforeEach:String');
  });

  afterEach(() => {
    globalThis.__JEST_FIXTURE_HOOKS__.push('afterEach:String');
  });

  test('should concatenate strings', () => {
    expect(testString + ' world').toBe('hello world');
  });

  test('should get string length', () => {
    expect(testString.length).toBe(5);
  });

  test.todo('implement string reversal');
});
