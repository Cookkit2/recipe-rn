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

  it("should correctly handle object references", () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const initialArray = [obj1];

    // Adding a different object
    expect(toggleFromArray(initialArray, obj2)).toEqual([obj1, obj2]);

    // Removing the exact same object reference
    expect(toggleFromArray(initialArray, obj1)).toEqual([]);

    // Adding an object with the same shape but different reference
    const obj1Clone = { id: 1 };
    expect(toggleFromArray(initialArray, obj1Clone)).toEqual([obj1, obj1Clone]);
  });

  it("should handle null and undefined values", () => {
    const initialArray: (number | null | undefined)[] = [1, null];

    // Adding undefined
    expect(toggleFromArray(initialArray, undefined)).toEqual([1, null, undefined]);

    // Removing null
    expect(toggleFromArray(initialArray, null)).toEqual([1]);
  });

  it("should handle falsy values", () => {
    const initialArray: (number | boolean | string)[] = [1, 2];

    // Adding 0
    expect(toggleFromArray(initialArray, 0)).toEqual([1, 2, 0]);

    // Adding false
    expect(toggleFromArray(initialArray, false)).toEqual([1, 2, false]);

    // Adding empty string
    expect(toggleFromArray(initialArray, "")).toEqual([1, 2, ""]);

    // Removing them
    const arrayWithFalsy: (number | boolean | string)[] = [0, false, ""];
    expect(toggleFromArray(arrayWithFalsy, 0)).toEqual([false, ""]);
    expect(toggleFromArray(arrayWithFalsy, false)).toEqual([0, ""]);
    expect(toggleFromArray(arrayWithFalsy, "")).toEqual([0, false]);
  });
});
