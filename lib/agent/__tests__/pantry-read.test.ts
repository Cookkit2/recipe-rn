import {
  formatPantryRead,
  formatPantryReadPages,
  PANTRY_READ_ERROR,
  pantryReadInputSchema,
  pantryReadResultSchema,
  runGetPantry,
  type PantryReadResult,
} from "../pantry-read";
import type { PantryItem } from "../tools/planning";

function item(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: "stock-1",
    name: "Eggs",
    quantity: 6,
    unit: "count",
    expiryDate: null,
    householdId: "private-household",
    addedByUserId: "private-user",
    ...overrides,
  };
}

describe("pantry read input", () => {
  it("defaults to 50 rows from the first row", () => {
    expect(pantryReadInputSchema.parse({})).toEqual({ limit: 50, offset: 0 });
  });

  it.each([
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { limit: "2" },
    { offset: -1 },
    { offset: 0.5 },
    { offset: "0" },
  ])("rejects an invalid page %j", (input) => {
    expect(pantryReadInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("formatPantryReadPages", () => {
  const first: PantryReadResult = {
    items: [{ id: "a", name: "Eggs", quantity: 2, unit: "count", expiryDate: null }],
    totalCount: 3,
    offset: 0,
    truncated: true,
  };
  const second: PantryReadResult = {
    items: [{ id: "b", name: "Eggs", quantity: 0.25, unit: "kg", expiryDate: null }],
    totalCount: 3,
    offset: 1,
    truncated: true,
  };
  const third: PantryReadResult = {
    items: [{ id: "c", name: "Milk", quantity: null, unit: null, expiryDate: null }],
    totalCount: 3,
    offset: 2,
    truncated: false,
  };

  it("formats contiguous pages once while preserving separate same-name batches", () => {
    const text = formatPantryReadPages([first, second, third]);
    expect(text).toContain("entries 1–3 of 3");
    expect(text).toContain("Eggs: 2 count");
    expect(text).toContain("Eggs: 0.25 kg");
    expect(text).toContain("Milk: quantity not recorded; unit not recorded");
    expect(text).not.toMatch(/partial pantry list|More pantry entries remain|^\s*[-*]\s/m);
  });

  it("shows one partial notice when accumulated pages leave more rows", () => {
    const text = formatPantryReadPages([first, second]);
    expect(text).toContain("entries 1–2 of 3");
    expect(text.match(/partial pantry list/g)).toHaveLength(1);
    expect(text.match(/More pantry entries remain/g)).toHaveLength(1);
  });

  it("keeps a nonzero-start sequence partial even when its final page is complete", () => {
    const text = formatPantryReadPages([second, third]);
    expect(text).toContain("entries 2–3 of 3");
    expect(text.match(/partial pantry list/g)).toHaveLength(1);
    expect(text).not.toContain("More pantry entries remain");
  });

  it("can combine more than the per-page limit of 100 entries", async () => {
    const data = {
      listPantry: async () =>
        Array.from({ length: 101 }, (_, index) => item({ id: String(index).padStart(3, "0") })),
    };
    const pages = [
      await runGetPantry(data, { limit: 100 }),
      await runGetPantry(data, { limit: 100, offset: 100 }),
    ];
    const text = formatPantryReadPages(pages);
    expect(text).toContain("entries 1–101 of 101");
    expect(text.match(/Eggs: 6 count/g)).toHaveLength(101);
    expect(text).not.toContain("partial pantry list");
  });

  it("formats a successful empty pantry", () => {
    expect(formatPantryReadPages([{ items: [], totalCount: 0, offset: 0, truncated: false }])).toBe(
      "Your pantry is empty."
    );
  });

  it.each([
    [],
    [first, third],
    [first, { ...second, totalCount: 4 }],
    [first, { ...second, items: [{ ...second.items[0]!, id: "a" }] }],
    [{ items: [], totalCount: 20, offset: 0, truncated: true }],
  ])("rejects missing, discontinuous, duplicate-ID or invalid pages %j", (...pages) => {
    expect(() => formatPantryReadPages(pages)).toThrow(PANTRY_READ_ERROR);
  });
});

describe("runGetPantry", () => {
  it("sorts by display name and row ID before paging without changing the source", async () => {
    const rows = [
      item({ id: "z", name: "Milk", quantity: 1, unit: "litre" }),
      item({ id: "b", quantity: 2, unit: "count" }),
      item({ id: "a", quantity: 0.25, unit: "kg" }),
      item({ id: "c", name: "Apples" }),
    ];
    const sourceOrder = rows.map((row) => row.id);
    const listPantry = jest.fn(async () => rows);

    await expect(runGetPantry({ listPantry }, { limit: 2, offset: 1 })).resolves.toEqual({
      items: [
        { id: "a", name: "Eggs", quantity: 0.25, unit: "kg", expiryDate: null },
        { id: "b", name: "Eggs", quantity: 2, unit: "count", expiryDate: null },
      ],
      totalCount: 4,
      offset: 1,
      truncated: true,
    });
    expect(rows.map((row) => row.id)).toEqual(sourceOrder);
    expect(listPantry).toHaveBeenCalledTimes(1);
  });

  it("preserves actual nullable and zero values and omits unrelated metadata", async () => {
    const result = await runGetPantry(
      {
        listPantry: async () => [
          item({ quantity: null, unit: null }),
          item({ id: "stock-2", quantity: 0, expiryDate: "2026-11-03T00:00:00.000Z" }),
        ],
      },
      {}
    );

    expect(result.items).toEqual([
      { id: "stock-1", name: "Eggs", quantity: null, unit: null, expiryDate: null },
      {
        id: "stock-2",
        name: "Eggs",
        quantity: 0,
        unit: "count",
        expiryDate: "2026-11-03T00:00:00.000Z",
      },
    ]);
    expect(pantryReadResultSchema.safeParse(result).success).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/household|private|addedBy|storage|location/i);
  });

  it("applies the default page size and reports remaining rows", async () => {
    const result = await runGetPantry(
      {
        listPantry: async () =>
          Array.from({ length: 51 }, (_, index) => item({ id: String(index).padStart(2, "0") })),
      },
      {}
    );

    expect(result.items).toHaveLength(50);
    expect(result).toMatchObject({ totalCount: 51, offset: 0, truncated: true });
  });

  it("reports no truncation on the last page", async () => {
    await expect(
      runGetPantry(
        { listPantry: async () => [item(), item({ id: "stock-2" })] },
        { limit: 1, offset: 1 }
      )
    ).resolves.toMatchObject({
      items: [{ id: "stock-2" }],
      totalCount: 2,
      offset: 1,
      truncated: false,
    });
  });

  it("reports an empty pantry only after a successful empty read", async () => {
    await expect(runGetPantry({ listPantry: async () => [] }, {})).resolves.toEqual({
      items: [],
      totalCount: 0,
      offset: 0,
      truncated: false,
    });
  });

  it("keeps an empty out-of-range page distinct from an empty pantry", async () => {
    await expect(
      runGetPantry({ listPantry: async () => [item()] }, { offset: 5 })
    ).resolves.toEqual({
      items: [],
      totalCount: 1,
      offset: 5,
      truncated: false,
    });
  });

  it.each([new Error("database failure"), "database failure"])(
    "reports a read failure as an error: %s",
    async (error) => {
      await expect(
        runGetPantry(
          {
            listPantry: async () => {
              throw error;
            },
          },
          {}
        )
      ).rejects.toThrow(PANTRY_READ_ERROR);
    }
  );

  it("fails closed if local rows cannot produce a valid DTO", async () => {
    await expect(
      runGetPantry({ listPantry: async () => [item({ quantity: NaN })] }, {})
    ).rejects.toThrow(PANTRY_READ_ERROR);
  });

  it("validates page input before reading local data", async () => {
    const listPantry = jest.fn(async () => [item()]);
    await expect(runGetPantry({ listPantry }, { limit: 101 })).rejects.toThrow(PANTRY_READ_ERROR);
    expect(listPantry).not.toHaveBeenCalled();
  });
});

describe("pantry read result validation", () => {
  it.each([
    { items: [], totalCount: -1, offset: 0, truncated: false },
    { items: [], totalCount: 0, offset: 0.5, truncated: false },
    { items: [], totalCount: 0, offset: 0, truncated: "false" },
    {
      items: [{ id: "x", name: "Eggs", quantity: "6", unit: "count", expiryDate: null }],
      totalCount: 1,
      offset: 0,
      truncated: false,
    },
    {
      items: [{ id: "x", name: "Eggs", quantity: 6, unit: "count" }],
      totalCount: 1,
      offset: 0,
      truncated: false,
    },
    { items: [], totalCount: 1, offset: 0, truncated: false },
    { items: [], totalCount: 20, offset: 0, truncated: true },
  ])("rejects malformed or contradictory output %j", (result) => {
    expect(pantryReadResultSchema.safeParse(result).success).toBe(false);
  });
});

describe("formatPantryRead", () => {
  it("keeps exact batches, names, quantities, units and recorded expiry in the fallback", async () => {
    const result = await runGetPantry(
      {
        listPantry: async () => [
          item({ id: "a", quantity: 0.25, unit: "kg", expiryDate: "2026-11-03T00:00:00.000Z" }),
          item({ id: "b", quantity: 2, unit: "count" }),
          item({ id: "c", name: "Vegetables", quantity: null, unit: null }),
          item({ id: "d", name: "Zero", quantity: 0, unit: "g" }),
        ],
      },
      {}
    );
    const text = formatPantryRead(result);

    expect(text).toContain("Eggs: 0.25 kg");
    expect(text).toContain("Eggs: 2 count");
    expect(text).toContain("2026-11-03T00:00:00.000Z");
    expect(text).toContain("Vegetables: quantity not recorded; unit not recorded");
    expect(text).toContain("Zero: 0 g");
    expect(text).not.toMatch(/private|fridge|calories|expired/i);
    expect(text).not.toMatch(/^\s*[-*]\s/m);
  });

  it("clearly reports a successful empty pantry", () => {
    expect(formatPantryRead({ items: [], totalCount: 0, offset: 0, truncated: false })).toBe(
      "Your pantry is empty."
    );
  });

  it("states paging limits without making exhaustive absence claims", () => {
    const text = formatPantryRead({
      items: [{ id: "a", name: "Eggs", quantity: 2, unit: "count", expiryDate: null }],
      totalCount: 3,
      offset: 1,
      truncated: true,
    });

    expect(text).toContain("2–2 of 3");
    expect(text).toContain("partial pantry list");
    expect(text).toContain("More pantry entries remain");
    expect(text).not.toMatch(/only|nothing else|no other|don't have|do not have/i);
  });

  it("marks a final nonzero-offset page as partial", () => {
    const text = formatPantryRead({
      items: [{ id: "b", name: "Milk", quantity: null, unit: "litre", expiryDate: null }],
      totalCount: 2,
      offset: 1,
      truncated: false,
    });
    expect(text).toContain("partial pantry list");
    expect(text).toContain("Milk: quantity not recorded; unit litre");
  });

  it("does not call an out-of-range page an empty pantry", () => {
    const text = formatPantryRead({ items: [], totalCount: 2, offset: 5, truncated: false });
    expect(text).toContain("No pantry entries on this page");
    expect(text).toContain("2 total");
    expect(text).not.toMatch(/pantry is empty/i);
  });
});
