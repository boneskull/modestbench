/**
 * Script with multiple functions for profile command testing. Used by:
 * profile-command.test.ts
 */
const funcA = () => {
  let sum = 0;
  for (let i = 0; i < 500000; i++) {
    sum += i;
  }
  return sum;
};

const funcB = () => {
  let product = 1;
  for (let i = 1; i < 100; i++) {
    product *= i;
  }
  return product;
};

for (let i = 0; i < 10; i++) {
  funcA();
  funcB();
}
