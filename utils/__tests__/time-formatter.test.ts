import { formatDuration } from "../time-formatter";

describe("formatDuration", () => {
  it("returns 'less than a second' for durations under 1000ms", () => {
    expect(formatDuration(0)).toBe("less than a second");
    expect(formatDuration(500)).toBe("less than a second");
    expect(formatDuration(999)).toBe("less than a second");
  });

  it("formats exactly 1000ms as '1 second'", () => {
    expect(formatDuration(1000)).toBe("1 second");
  });

  it("formats multiple seconds correctly", () => {
    expect(formatDuration(5000)).toBe("5 seconds");
    expect(formatDuration(15000)).toBe("15 seconds");
  });

  it("handles larger durations rounded down to seconds", () => {
    // 125000ms = 125 seconds.
    // wait, formatDistanceStrict with unit: 'second' will output '125 seconds'
    // let's just assert that.
    expect(formatDuration(125000)).toBe("125 seconds");
  });
});
