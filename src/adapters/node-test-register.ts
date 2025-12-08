import { register } from 'node:module';

register('./node-test-hooks.js', {
  parentURL: import.meta.url,
});
