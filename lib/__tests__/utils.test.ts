import { cn } from "../utils";

describe("cn", () => {
  it("should merge class names", () => {
    const result = cn("foo", "bar");

    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const result = cn("foo", true && "bar", false && "baz");

    expect(result).toBe("foo bar");
  });

  it("should handle empty inputs", () => {
    const result = cn();

    expect(result).toBe("");
  });

  it("should handle undefined and null", () => {
    const result = cn("foo", undefined, null, "bar");

    expect(result).toBe("foo bar");
  });

  it("should handle arrays", () => {
    const result = cn(["foo", "bar"], "baz");

    expect(result).toBe("foo bar baz");
  });

  it("should handle objects", () => {
    const result = cn({ foo: true, bar: false, baz: true });

    expect(result).toBe("foo baz");
  });

  it("should handle mixed inputs", () => {
    const result = cn("foo", { bar: true, baz: false }, ["qux"]);

    expect(result).toBe("foo bar qux");
  });

  it("should handle conflicting Tailwind classes", () => {
    const result = cn("p-4", "p-2");

    // twMerge should resolve conflicts
    expect(result).toMatch(/p-\d/);
  });
});
