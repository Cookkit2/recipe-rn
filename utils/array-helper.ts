export const toggleFromArray = <T>(arr: T[], value: T) =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
