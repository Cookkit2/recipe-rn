import { toggleFromArray } from "../array-helper";

describe("toggleFromArray", () => {
  it("should add an item to an empty array", () => {
    const result = toggleFromArray([], "apple");
    expect(result).toEqual(["apple"]);
  });

  it("should add an item to an array if it doesn't exist", () => {
    const result = toggleFromArray(["apple", "banana"], "orange");
    expect(result).toEqual(["apple", "banana", "orange"]);
  });

  it("should remove an item from an array if it already exists", () => {
    const result = toggleFromArray(["apple", "banana", "orange"], "banana");
    expect(result).toEqual(["apple", "orange"]);
  });

  it("should return a new array instance when adding an item", () => {
    const arr = ["apple"];
    const result = toggleFromArray(arr, "banana");
    expect(result).not.toBe(arr);
    expect(arr).toEqual(["apple"]); // Ensure original is not mutated
  });

  it("should return a new array instance when removing an item", () => {
    const arr = ["apple", "banana"];
    const result = toggleFromArray(arr, "banana");
    expect(result).not.toBe(arr);
    expect(arr).toEqual(["apple", "banana"]); // Ensure original is not mutated
  });

  it("should handle numbers", () => {
    expect(toggleFromArray([1, 2, 3], 4)).toEqual([1, 2, 3, 4]);
    expect(toggleFromArray([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it("should handle objects by reference", () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const arr = [obj1];

    // Adding
    expect(toggleFromArray(arr, obj2)).toEqual([obj1, obj2]);

    // Removing
    expect(toggleFromArray([obj1, obj2], obj1)).toEqual([obj2]);

    // Note: It doesn't handle objects by value, only reference
    const similarObj = { id: 1 };
    expect(toggleFromArray(arr, similarObj)).toEqual([obj1, similarObj]);
  });
});
