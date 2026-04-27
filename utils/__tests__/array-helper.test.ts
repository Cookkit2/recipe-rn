import { toggleFromArray } from "../array-helper";

describe("toggleFromArray", () => {
  it("should add value when not present in array", () => {
    const arr = [1, 2, 3];
    const result = toggleFromArray(arr, 4);

    expect(result).toEqual([1, 2, 3, 4]);
    expect(result).not.toBe(arr); // Should return new array
  });

  it("should remove value when present in array", () => {
    const arr = [1, 2, 3, 4];
    const result = toggleFromArray(arr, 3);

    expect(result).toEqual([1, 2, 4]);
    expect(result).not.toBe(arr); // Should return new array
  });

  it("should handle empty array", () => {
    const result = toggleFromArray([], 1);

    expect(result).toEqual([1]);
  });

  it("should handle removing from single element array", () => {
    const result = toggleFromArray([1], 1);

    expect(result).toEqual([]);
  });

  it("should handle removing first element", () => {
    const result = toggleFromArray([1, 2, 3], 1);

    expect(result).toEqual([2, 3]);
  });

  it("should handle removing last element", () => {
    const result = toggleFromArray([1, 2, 3], 3);

    expect(result).toEqual([1, 2]);
  });

  it("should handle strings", () => {
    const arr = ["apple", "banana"];
    const result = toggleFromArray(arr, "cherry");

    expect(result).toEqual(["apple", "banana", "cherry"]);
  });

  it("should remove string from array", () => {
    const arr = ["apple", "banana", "cherry"];
    const result = toggleFromArray(arr, "banana");

    expect(result).toEqual(["apple", "cherry"]);
  });

  it("should handle objects by reference", () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const arr = [obj1, obj2];

    const result = toggleFromArray(arr, obj1);

    expect(result).toEqual([obj2]);
  });

  it("should not add duplicate values", () => {
    const arr = [1, 2, 3];
    const result1 = toggleFromArray(arr, 2);
    const result2 = toggleFromArray(result1, 2);

    expect(result1).toEqual([1, 3]);
    expect(result2).toEqual([1, 3, 2]);
  });

  it("should handle array with duplicate values", () => {
    const arr = [1, 2, 2, 3];
    const result = toggleFromArray(arr, 2);

    expect(result).toEqual([1, 2, 3]); // Removes first occurrence
  });
});
