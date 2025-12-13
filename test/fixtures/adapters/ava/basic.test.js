/**
 * Basic AVA test fixture for adapter E2E testing
 */
import test from 'ava';

// Track hook execution for verification
globalThis.__AVA_FIXTURE_HOOKS__ = globalThis.__AVA_FIXTURE_HOOKS__ || [];

test.before(() => {
  globalThis.__AVA_FIXTURE_HOOKS__.push('before');
});

test.after(() => {
  globalThis.__AVA_FIXTURE_HOOKS__.push('after');
});

test.beforeEach(() => {
  globalThis.__AVA_FIXTURE_HOOKS__.push('beforeEach');
});

test.afterEach(() => {
  globalThis.__AVA_FIXTURE_HOOKS__.push('afterEach');
});

test('should add two numbers', (t) => {
  t.is(1 + 1, 2);
});

test('should subtract two numbers', (t) => {
  t.is(5 - 3, 2);
});

test('should multiply two numbers', (t) => {
  t.is(2 * 3, 6);
});

test.skip('should handle negative numbers', (t) => {
  t.is(-2 * 3, -6);
});

test('should concatenate strings', (t) => {
  t.is('hello' + ' world', 'hello world');
});

test('should get string length', (t) => {
  t.is('hello'.length, 5);
});

test.todo('implement string reversal');
