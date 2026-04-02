export const toggleFromArray = <T>(arr: T[], value: T) => {
  const index = arr.indexOf(value);
  if (index === -1) {
    return [...arr, value];
  }
  const result = [...arr];
  result.splice(index, 1);
  return result;
};
