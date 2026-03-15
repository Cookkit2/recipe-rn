import { truncate, truncateWords } from "../text-formatter";

describe("truncate", () => {
  it("returns empty string if input is empty", () => {
    expect(truncate("", 10)).toBe("");
    expect(truncate(null as any, 10)).toBe(null);
    expect(truncate(undefined as any, 10)).toBe(undefined);
  });

  it("returns original string if length is less than or equal to target length", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates string to exact length including suffix", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("handles custom suffix", () => {
    expect(truncate("hello world", 8, "!!")).toBe("hello !!");
  });
});

describe("truncateWords", () => {
  it("returns empty string if input is empty", () => {
    expect(truncateWords("", 2)).toBe("");
    expect(truncateWords(null as any, 2)).toBe("");
    expect(truncateWords(undefined as any, 2)).toBe("");
  });

  it("returns original string if word count is less than or equal to target count", () => {
    expect(truncateWords("hello world", 2)).toBe("hello world");
    expect(truncateWords("hello world", 3)).toBe("hello world");
  });

  it("truncates string to exact word count and appends suffix", () => {
    expect(truncateWords("hello beautiful world out there", 2)).toBe("hello beautiful...");
  });

  it("handles custom suffix", () => {
    expect(truncateWords("hello beautiful world out there", 2, " !!")).toBe("hello beautiful !!");
  });
});
