import { formatDistance, formatOpenStatus } from "../store-display";

describe("store-display utilities", () => {
  describe("formatDistance", () => {
    it("formats distances less than 1km in meters", () => {
      expect(formatDistance(0.5)).toBe("500m");
      expect(formatDistance(0.999)).toBe("999m");
    });

    it("formats distances exactly 1km or greater in kilometers with one decimal place", () => {
      expect(formatDistance(1)).toBe("1.0km");
      expect(formatDistance(1.5)).toBe("1.5km");
      expect(formatDistance(2.78)).toBe("2.8km");
    });

    it("throws an error for negative distances", () => {
      expect(() => formatDistance(-1)).toThrow("Distance cannot be negative");
    });
  });

  describe("formatOpenStatus", () => {
    it("returns 'Closed' when isOpen is false", () => {
      expect(formatOpenStatus(false)).toBe("Closed");
      expect(formatOpenStatus(false, "22:00")).toBe("Closed");
    });

    it("returns 'Open' when isOpen is true and no closingTime is provided", () => {
      expect(formatOpenStatus(true)).toBe("Open");
    });

    it("returns 'Open until [closingTime]' when isOpen is true and closingTime is provided", () => {
      expect(formatOpenStatus(true, "22:00")).toBe("Open until 22:00");
      expect(formatOpenStatus(true, "17:30")).toBe("Open until 17:30");
    });
  });
});
