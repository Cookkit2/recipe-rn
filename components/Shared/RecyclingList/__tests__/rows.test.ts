import { createListRows, rangeForRows } from "../rows";

describe("native list grid rows", () => {
  const key = (item: { id: string }) => item.id;
  it("keeps every item and original index when grouping a large odd grid", () => {
    const items = Array.from({ length: 10_001 }, (_, index) => ({ id: String(index) }));
    const rows = createListRows(items, 2, key);
    expect(rows).toHaveLength(5001);
    expect(rows.flatMap((row) => row.cells.map((cell) => cell.item))).toEqual(items);
    expect(rows.at(-1)?.cells).toEqual([{ item: items.at(-1), index: 10_000, key: "10000" }]);
    expect(rangeForRows(rows, 3, 5)).toEqual({ first: 6, last: 11 });
  });
  it("uses item identities rather than positions after filtering and reordering", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const original = createListRows(items, 2, key);
    const filtered = createListRows(items.slice(2), 2, key);
    expect(filtered[0]?.key).toBe(original[1]?.key);
    expect(rangeForRows(filtered, 0, 0)).toEqual({ first: 0, last: 1 });
    expect(new Set(original.map((row) => row.key)).size).toBe(original.length);
  });
  it("keeps horizontal items separate and handles empty data", () => {
    expect(createListRows([{ id: "a" }, { id: "b" }], 1, key)).toHaveLength(2);
    expect(createListRows([], 2, key)).toEqual([]);
    expect(rangeForRows([], 0, 0)).toBeUndefined();
  });
  it("rejects duplicate keys and invalid column counts", () => {
    expect(() => createListRows([{ id: "a" }, { id: "a" }], 2, key)).toThrow("unique");
    expect(() => createListRows([], 0, key)).toThrow("positive integer");
  });
});
