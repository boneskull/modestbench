/**
 * Script with a hot function for profile command testing. Used by:
 * profile-command.test.ts
 */
const hotFunction = () => {
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }
  return sum;
};

for (let i = 0; i < 10; i++) {
  hotFunction();
}
