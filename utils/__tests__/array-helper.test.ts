import { toggleFromArray } from "../array-helper";

describe("toggleFromArray", () => {
  it("should add the value to the array if it does not exist", () => {
    const initialArray = [1, 2, 3];
    const valueToAdd = 4;
    const result = toggleFromArray(initialArray, valueToAdd);

    expect(result).toEqual([1, 2, 3, 4]);
  });

  it("should remove the value from the array if it exists", () => {
    const initialArray = [1, 2, 3, 4];
    const valueToRemove = 3;
    const result = toggleFromArray(initialArray, valueToRemove);

    expect(result).toEqual([1, 2, 4]);
  });

  it("should not mutate the original array when adding an item", () => {
    const initialArray = [1, 2, 3];
    const valueToAdd = 4;
    toggleFromArray(initialArray, valueToAdd);

    expect(initialArray).toEqual([1, 2, 3]);
  });

  it("should not mutate the original array when removing an item", () => {
    const initialArray = [1, 2, 3];
    const valueToRemove = 2;
    toggleFromArray(initialArray, valueToRemove);

    expect(initialArray).toEqual([1, 2, 3]);
  });

  it("should only remove the first instance of a duplicate value", () => {
    const initialArray = [1, 2, 2, 3];
    const valueToRemove = 2;
    const result = toggleFromArray(initialArray, valueToRemove);

    expect(result).toEqual([1, 2, 3]);
  });

  it("should correctly handle arrays of strings", () => {
    const initialArray = ["apple", "banana"];

    // Add
    expect(toggleFromArray(initialArray, "orange")).toEqual(["apple", "banana", "orange"]);

    // Remove
    expect(toggleFromArray(initialArray, "banana")).toEqual(["apple"]);
  });

  it("should work with empty arrays", () => {
    expect(toggleFromArray([], 1)).toEqual([1]);
  });
});
