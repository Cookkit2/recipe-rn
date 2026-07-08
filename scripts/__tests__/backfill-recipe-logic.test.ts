import {
  parseArgs,
  getBucketPublicHost,
  decideMigration,
  objectKeyFor,
  bytesSaved,
} from "~/scripts/lib/backfill-recipe-logic";

const HOST = "https://xyz.supabase.co/storage/v1/object/public/recipe-images/";

describe("parseArgs", () => {
  it("uses defaults when no args", () => {
    expect(parseArgs([])).toEqual({
      dryRun: false,
      limit: undefined,
      quality: 85,
      maxWidth: undefined,
      concurrency: 5,
    });
  });

  it("parses --dry-run boolean", () => {
    expect(parseArgs(["--dry-run"]).dryRun).toBe(true);
  });

  it("parses space-separated numeric flags", () => {
    const o = parseArgs(["--limit", "10", "--quality", "70", "--max-width", "800", "--concurrency", "3"]);
    expect(o).toMatchObject({ limit: 10, quality: 70, maxWidth: 800, concurrency: 3 });
  });

  it("parses equals-separated numeric flags", () => {
    const o = parseArgs(["--limit=10", "--quality=70", "--max-width=800", "--concurrency=3"]);
    expect(o).toMatchObject({ limit: 10, quality: 70, maxWidth: 800, concurrency: 3 });
  });

  it("throws on unknown argument", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown argument/);
  });

  it("throws when a numeric flag has no value", () => {
    expect(() => parseArgs(["--limit"])).toThrow(/Missing value for --limit/);
  });

  it("throws on non-integer numeric value", () => {
    expect(() => parseArgs(["--limit=abc"])).toThrow(/Expected integer for --limit/);
  });
});

describe("getBucketPublicHost", () => {
  it("builds the public object URL prefix", () => {
    expect(getBucketPublicHost("https://xyz.supabase.co", "recipe-images")).toBe(HOST);
  });

  it("trims trailing slashes from the base url", () => {
    expect(getBucketPublicHost("https://xyz.supabase.co/", "recipe-images")).toBe(HOST);
    expect(getBucketPublicHost("https://xyz.supabase.co///", "recipe-images")).toBe(HOST);
  });
});

describe("decideMigration", () => {
  it("skips null", () => {
    expect(decideMigration(null, HOST).action).toBe("skip_empty");
  });
  it("skips undefined", () => {
    expect(decideMigration(undefined, HOST).action).toBe("skip_empty");
  });
  it("skips empty and whitespace-only strings", () => {
    expect(decideMigration("", HOST).action).toBe("skip_empty");
    expect(decideMigration("   ", HOST).action).toBe("skip_empty");
  });
  it("skips urls already in our bucket", () => {
    expect(decideMigration(HOST + "abc.webp", HOST).action).toBe("skip_migrated");
  });
  it("migrates external urls", () => {
    expect(decideMigration("https://other.example.com/img.jpg", HOST).action).toBe("migrate");
  });
});

describe("objectKeyFor", () => {
  it("returns <id>.webp", () => {
    expect(objectKeyFor("abc-123")).toBe("abc-123.webp");
  });
});

describe("bytesSaved", () => {
  it("returns the positive difference", () => {
    expect(bytesSaved(1000, 300)).toBe(700);
  });
  it("never returns a negative number", () => {
    expect(bytesSaved(300, 1000)).toBe(0);
  });
});
