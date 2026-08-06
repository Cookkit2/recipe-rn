import {
  parsePantryTranscript,
  parseFragment,
  singularize,
  splitTranscript,
} from "../pantry-voice-parser";

describe("singularize", () => {
  it("converts regular plurals", () => {
    expect(singularize("eggs")).toBe("egg");
    expect(singularize("tomatoes")).toBe("tomato");
    expect(singularize("berries")).toBe("berry");
    expect(singularize("boxes")).toBe("box");
    expect(singularize("dishes")).toBe("dish");
  });

  it("leaves singular words untouched", () => {
    expect(singularize("milk")).toBe("milk");
    expect(singularize("cheese")).toBe("cheese"); // ends in 'se', not 's'-only rule
  });
});

describe("splitTranscript", () => {
  it("splits on commas and 'and'", () => {
    expect(splitTranscript("two eggs, milk and cheddar")).toEqual(["two eggs", "milk", "cheddar"]);
  });

  it("returns empty array for empty string", () => {
    expect(splitTranscript("")).toEqual([]);
  });

  it("returns empty array for whitespace string", () => {
    expect(splitTranscript("   ")).toEqual([]);
  });

  it("returns single item for string lacking split tokens", () => {
    expect(splitTranscript("just a single item")).toEqual(["just a single item"]);
  });

  it("handles leading and trailing split tokens", () => {
    expect(splitTranscript("and milk,")).toEqual(["milk"]);
  });

  it("splits on semicolons and newlines", () => {
    expect(splitTranscript("spinach; tofu\nbread")).toEqual(["spinach", "tofu", "bread"]);
  });

  it("drops empty fragments", () => {
    expect(splitTranscript("milk, , , cheese")).toEqual(["milk", "cheese"]);
  });
});

describe("parseFragment", () => {
  it("parses a bare ingredient name with default quantity/unit", () => {
    const parsed = parseFragment("milk");
    expect(parsed).toEqual({ name: "Milk", quantity: 1, unit: "unit", lowConfidence: false });
  });

  it("parses a leading word-number quantity", () => {
    const parsed = parseFragment("two eggs");
    expect(parsed?.name).toBe("Egg");
    expect(parsed?.quantity).toBe(2);
    expect(parsed?.unit).toBe("unit");
  });

  it("parses a numeric quantity", () => {
    const parsed = parseFragment("3 cups flour");
    expect(parsed?.name).toBe("Flour");
    expect(parsed?.quantity).toBe(3);
    expect(parsed?.unit).toBe("cup");
  });

  it("handles 'half a gallon of milk' container+of pattern", () => {
    const parsed = parseFragment("half a gallon of milk");
    expect(parsed?.name).toBe("Milk");
    expect(parsed?.quantity).toBe(0.5);
    expect(parsed?.unit).toBe("gallon");
  });

  it("handles 'two dozen eggs' multiplier", () => {
    const parsed = parseFragment("two dozen eggs");
    expect(parsed?.name).toBe("Egg");
    expect(parsed?.quantity).toBe(24);
  });

  it("strips filler words", () => {
    const parsed = parseFragment("please add some cheddar");
    expect(parsed?.name).toBe("Cheddar");
  });

  it("returns undefined for garbage", () => {
    expect(parseFragment("!!! ???")).toBeUndefined();
    expect(parseFragment("")).toBeUndefined();
    expect(parseFragment("of a the")).toBeUndefined();
  });
});

describe("parsePantryTranscript", () => {
  it("returns empty for blank/garbage input", () => {
    expect(parsePantryTranscript("")).toEqual([]);
    expect(parsePantryTranscript("   ")).toEqual([]);
    expect(parsePantryTranscript("!!! ???")).toEqual([]);
  });

  it("parses a comma/and-separated list", () => {
    const items = parsePantryTranscript("two eggs, milk and cheddar");
    const names = items.map((i) => i.name).sort();
    expect(names).toEqual(["Cheddar", "Egg", "Milk"]);

    const eggs = items.find((i) => i.name === "Egg");
    expect(eggs?.quantity).toBe(2);
  });

  it("marks every candidate as status undefined (save-eligible)", () => {
    const items = parsePantryTranscript("spinach, tofu, bread");
    for (const item of items) {
      expect(item.status).toBeUndefined();
      expect(item.id).toMatch(/^voice-/);
      expect(item.type).toBe("cabinet");
    }
  });

  it("merges duplicate names within the same transcript when units match", () => {
    const items = parsePantryTranscript("two eggs and three eggs");
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(5);
  });

  it("keeps separate items when units differ", () => {
    const items = parsePantryTranscript("2 cups milk and 1 liter milk");
    // "liter" maps to unit "l"; "cup" stays "cup" — units differ, so both kept.
    expect(items).toHaveLength(2);
  });

  it("parses quantity+unit extraction across multiple items", () => {
    const items = parsePantryTranscript("2 lb chicken, half a gallon of milk, 3 eggs");
    const byName = new Map(items.map((i) => [i.name, i]));

    expect(byName.get("Chicken")?.quantity).toBe(2);
    expect(byName.get("Chicken")?.unit).toBe("lb");

    expect(byName.get("Milk")?.quantity).toBe(0.5);
    expect(byName.get("Milk")?.unit).toBe("gallon");

    expect(byName.get("Egg")?.quantity).toBe(3);
  });

  it("assigns each candidate a voice-prefixed id", () => {
    const items = parsePantryTranscript("spinach, tofu, bread, butter");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.id).toMatch(/^voice-/);
    }
  });
});
