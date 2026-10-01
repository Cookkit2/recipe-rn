import { formatDuration, formatSyncTime } from "../time-formatter";

describe("formatDuration", () => {
  it('returns "less than a second" for durations under 1000ms', () => {
    expect(formatDuration(0)).toBe("less than a second");
    expect(formatDuration(999)).toBe("less than a second");
  });

  it("formats exactly 1 second", () => {
    expect(formatDuration(1000)).toBe("1 second");
  });

  it("formats multiple seconds", () => {
    expect(formatDuration(5000)).toBe("5 seconds");
  });

  it("formats exact minutes", () => {
    expect(formatDuration(60000)).toBe("1 minute");
    expect(formatDuration(120000)).toBe("2 minutes");
  });

  it("formats exact hours", () => {
    expect(formatDuration(3600000)).toBe("1 hour");
    expect(formatDuration(7200000)).toBe("2 hours");
  });

  it("formats combinations correctly", () => {
    // 2 minutes and 5 seconds -> 125000ms
    expect(formatDuration(125000)).toBe("2 minutes 5 seconds");
  });
});

describe("formatSyncTime", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns "Never" if ts is null', () => {
    expect(formatSyncTime(null)).toBe("Never");
  });

  it('returns "Just now" for less than 10 seconds ago', () => {
    const now = Date.now();
    expect(formatSyncTime(now - 5000)).toBe("Just now");
  });

  it("returns seconds ago for less than 60 seconds ago", () => {
    const now = Date.now();
    expect(formatSyncTime(now - 30000)).toBe("30s ago");
  });

  it("returns minutes ago for less than 60 minutes ago", () => {
    const now = Date.now();
    expect(formatSyncTime(now - 300000)).toBe("5m ago");
  });

  it("returns hours ago for 60 or more minutes ago", () => {
    const now = Date.now();
    expect(formatSyncTime(now - 7200000)).toBe("2h ago");
  });
});
