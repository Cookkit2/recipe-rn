import {
  parseArgs,
  getBucketPublicHost,
  decideMigration,
  objectKeyFor,
  objectPathFromUrl,
  swapExtensionToWebp,
  targetKeyFor,
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

  it("rejects hex/scientific/empty strings as non-integers", () => {
    expect(() => parseArgs(["--limit=0x10"])).toThrow(/Expected integer for --limit/);
    expect(() => parseArgs(["--limit=1e2"])).toThrow(/Expected integer for --limit/);
    expect(() => parseArgs(["--limit="])).toThrow(/Expected integer for --limit/);
  });

  it("rejects concurrency below 1", () => {
    expect(() => parseArgs(["--concurrency=0"])).toThrow(/--concurrency must be >= 1/);
    expect(() => parseArgs(["--concurrency=-1"])).toThrow(/--concurrency must be >= 1/);
  });

  it("rejects limit below 1 when provided", () => {
    expect(() => parseArgs(["--limit=0"])).toThrow(/--limit must be >= 1/);
    expect(() => parseArgs(["--limit=-5"])).toThrow(/--limit must be >= 1/);
  });

  it("rejects quality outside [1,100]", () => {
    expect(() => parseArgs(["--quality=0"])).toThrow(/--quality must be between 1 and 100/);
    expect(() => parseArgs(["--quality=101"])).toThrow(/--quality must be between 1 and 100/);
    expect(() => parseArgs(["--quality=-1"])).toThrow(/--quality must be between 1 and 100/);
  });

  it("rejects max-width below 1 when provided", () => {
    expect(() => parseArgs(["--max-width=0"])).toThrow(/--max-width must be >= 1/);
    expect(() => parseArgs(["--max-width=-3"])).toThrow(/--max-width must be >= 1/);
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
  it("skips in-bucket .webp urls (already converted)", () => {
    expect(decideMigration(HOST + "abc.webp", HOST).action).toBe("skip_webp");
    expect(decideMigration(HOST + "foo.webp?token=1", HOST).action).toBe("skip_webp");
  });
  it("migrates in-bucket non-webp urls (jpg/png/jpeg/avif need recompression)", () => {
    expect(decideMigration(HOST + "steamed-oysters.jpg", HOST).action).toBe("migrate");
    expect(decideMigration(HOST + "foo.png", HOST).action).toBe("migrate");
    expect(decideMigration(HOST + "a.jpeg", HOST).action).toBe("migrate");
    expect(decideMigration(HOST + "b.avif", HOST).action).toBe("migrate");
  });
  it("migrates external urls", () => {
    expect(decideMigration("https://other.example.com/img.jpg", HOST).action).toBe("migrate");
  });
});

describe("objectPathFromUrl", () => {
  it("extracts the object path from an in-bucket url", () => {
    expect(objectPathFromUrl(HOST + "steamed-oysters.jpg", HOST)).toBe("steamed-oysters.jpg");
  });
  it("strips query strings", () => {
    expect(objectPathFromUrl(HOST + "foo.png?x=1&y=2", HOST)).toBe("foo.png");
  });
  it("returns null for external urls", () => {
    expect(objectPathFromUrl("https://other.com/a.jpg", HOST)).toBeNull();
  });
  it("returns null for null/empty/host-only urls", () => {
    expect(objectPathFromUrl(null, HOST)).toBeNull();
    expect(objectPathFromUrl("", HOST)).toBeNull();
    expect(objectPathFromUrl(HOST, HOST)).toBeNull();
  });
  it("URI-decodes the object path (spaces/special chars round-trip)", () => {
    expect(objectPathFromUrl(HOST + "images%20(2).jpeg", HOST)).toBe("images (2).jpeg");
    expect(objectPathFromUrl(HOST + "%E2%97%8F-bullet.png", HOST)).toBe("●-bullet.png");
  });
});

describe("swapExtensionToWebp", () => {
  it("replaces the last extension", () => {
    expect(swapExtensionToWebp("steamed-oysters.jpg")).toBe("steamed-oysters.webp");
    expect(swapExtensionToWebp("foo.png")).toBe("foo.webp");
    expect(swapExtensionToWebp("a.b.jpeg")).toBe("a.b.webp");
  });
  it("appends .webp when there is no extension", () => {
    expect(swapExtensionToWebp("noext")).toBe("noext.webp");
  });
  it("ignores a trailing query string", () => {
    expect(swapExtensionToWebp("foo.jpg?x=1")).toBe("foo.webp");
  });
});

describe("targetKeyFor", () => {
  it("preserves an in-bucket key with the extension swapped", () => {
    expect(targetKeyFor(HOST + "steamed-oysters.jpg", HOST, "r-1")).toBe("steamed-oysters.webp");
  });
  it("falls back to <id>.webp for external urls", () => {
    expect(targetKeyFor("https://other.com/a.jpg", HOST, "r-1")).toBe("r-1.webp");
  });
  it("decodes an encoded in-bucket key before swapping the extension", () => {
    expect(targetKeyFor(HOST + "images%20(2).jpeg", HOST, "r-1")).toBe("images (2).webp");
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
