import { formatDistance, formatOpenStatus, getStoreOpenStatus } from "../store-display";

describe("getStoreOpenStatus", () => {
  const mockDate = new Date("2023-10-18T12:00:00Z"); // Wednesday (day 3), 12:00 PM UTC

  it("returns closed if no opening hours provided", () => {
    expect(getStoreOpenStatus(null, mockDate)).toEqual({ isOpen: false, closingTime: undefined });
    expect(getStoreOpenStatus([], mockDate)).toEqual({ isOpen: false, closingTime: undefined });
    expect(getStoreOpenStatus(undefined, mockDate)).toEqual({
      isOpen: false,
      closingTime: undefined,
    });
  });

  it("returns closed if no hours match current day", () => {
    const hours = [{ day: 4, open: "08:00", close: "20:00" }];
    expect(getStoreOpenStatus(hours, mockDate)).toEqual({ isOpen: false, closingTime: undefined });
  });

  it("returns open and closing time when currently open", () => {
    const hours = [{ day: 3, open: "08:00", close: "20:00" }];
    expect(getStoreOpenStatus(hours, mockDate)).toEqual({ isOpen: true, closingTime: "20:00" });
  });

  it("returns closed when before opening time", () => {
    const hours = [{ day: 3, open: "14:00", close: "20:00" }];
    expect(getStoreOpenStatus(hours, mockDate)).toEqual({ isOpen: false, closingTime: undefined });
  });

  it("returns closed when after closing time", () => {
    const hours = [{ day: 3, open: "08:00", close: "11:00" }];
    expect(getStoreOpenStatus(hours, mockDate)).toEqual({ isOpen: false, closingTime: undefined });
  });

  it("handles overnight hours correctly when open", () => {
    // Open from 8am to 2am next day. Current time is 12pm.
    const hours = [{ day: 3, open: "08:00", close: "02:00" }];
    expect(getStoreOpenStatus(hours, mockDate)).toEqual({ isOpen: true, closingTime: "02:00" });
  });

  it("handles overnight hours correctly when closed", () => {
    // Open from 2pm to 2am next day. Current time is 12pm.
    const hours = [{ day: 3, open: "14:00", close: "02:00" }];
    expect(getStoreOpenStatus(hours, mockDate)).toEqual({ isOpen: false, closingTime: undefined });
  });
});

describe("formatDistance", () => {
  it("formats distances under 1km in meters", () => {
    expect(formatDistance(0.5)).toBe("500m");
    expect(formatDistance(0.05)).toBe("50m");
    expect(formatDistance(0.999)).toBe("999m");
    expect(formatDistance(0.001)).toBe("1m");
    expect(formatDistance(0.049)).toBe("49m");
  });

  it("formats distances 1km and above in kilometers", () => {
    expect(formatDistance(1)).toBe("1.0km");
    expect(formatDistance(1.5)).toBe("1.5km");
    expect(formatDistance(2.25)).toBe("2.3km");
    expect(formatDistance(10.123)).toBe("10.1km");
  });

  it("throws error for negative distances", () => {
    expect(() => formatDistance(-1)).toThrow("Distance cannot be negative");
    expect(() => formatDistance(-0.1)).toThrow("Distance cannot be negative");
  });

  it("handles zero distance", () => {
    expect(formatDistance(0)).toBe("0m");
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
