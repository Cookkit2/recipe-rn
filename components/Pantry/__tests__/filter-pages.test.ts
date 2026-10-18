import { paginateFilterChips } from "../filter-pages";

const chips = [
  { value: "all", width: 57.667 },
  { value: "fridge", width: 80.333 },
  { value: "cabinet", width: 89.333 },
  { value: "freezer", width: 87.667 },
];

describe("pantry filter pages", () => {
  it("keeps complete tags together at the measured iPhone viewport width", () => {
    expect(paginateFilterChips(chips, 241.667, 6)).toEqual([
      ["all", "fridge", "cabinet"],
      ["freezer"],
    ]);
  });

  it("repacks tags when the viewport narrows", () => {
    expect(paginateFilterChips(chips, 160, 6)).toEqual([
      ["all", "fridge"],
      ["cabinet"],
      ["freezer"],
    ]);
  });

  it("includes the gap when a pair fits exactly", () => {
    expect(paginateFilterChips(chips.slice(0, 2), 144, 6)).toEqual([["all", "fridge"]]);
    expect(paginateFilterChips(chips.slice(0, 2), 143, 6)).toEqual([["all"], ["fridge"]]);
  });

  it("does not create empty pages for empty data or an oversized tag", () => {
    expect(paginateFilterChips([], 100, 8)).toEqual([]);
    expect(paginateFilterChips([{ value: "freezer", width: 120 }], 100, 8)).toEqual([["freezer"]]);
  });
});
