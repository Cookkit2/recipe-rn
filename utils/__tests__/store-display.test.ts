import { formatDistance, formatOpenStatus } from "../store-display";

describe("formatDistance", () => {
  it("formats distances under 1km in meters", () => {
    expect(formatDistance(0.5)).toBe("500m away");
    expect(formatDistance(0.05)).toBe("50m away");
    expect(formatDistance(0.999)).toBe("999m away");
    expect(formatDistance(0.001)).toBe("1m away");
    expect(formatDistance(0.049)).toBe("49m away");
  });

  it("formats distances 1km and above in kilometers", () => {
    expect(formatDistance(1)).toBe("1.0km away");
    expect(formatDistance(1.5)).toBe("1.5km away");
    expect(formatDistance(2.25)).toBe("2.3km away");
    expect(formatDistance(10.123)).toBe("10.1km away");
  });

  it("throws error for negative distances", () => {
    expect(() => formatDistance(-1)).toThrow("Distance cannot be negative");
    expect(() => formatDistance(-0.1)).toThrow("Distance cannot be negative");
  });

  it("handles zero distance", () => {
    expect(formatDistance(0)).toBe("0m away");
  });
});

describe("formatOpenStatus", () => {
  it("returns Open with closing time when store is open", () => {
    expect(formatOpenStatus(true, "22:00")).toBe("Open until 22:00");
    expect(formatOpenStatus(true, "18:30")).toBe("Open until 18:30");
  });

  it("returns Open without time when store is open but no closing time", () => {
    expect(formatOpenStatus(true, undefined)).toBe("Open");
    expect(formatOpenStatus(true, "")).toBe("Open");
  });

  it("returns Closed when store is closed", () => {
    expect(formatOpenStatus(false, "22:00")).toBe("Closed");
    expect(formatOpenStatus(false, undefined)).toBe("Closed");
  });
});
