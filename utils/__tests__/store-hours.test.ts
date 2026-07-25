import { calculateStoreStatus, timeToMinutes } from "../store-hours";
import type { OpeningHour } from "~/lib/supabase/supabase-types";

describe("store-hours utilities", () => {
  describe("timeToMinutes", () => {
    it("converts HH:MM to minutes since midnight", () => {
      expect(timeToMinutes("00:00")).toBe(0);
      expect(timeToMinutes("08:30")).toBe(8 * 60 + 30);
      expect(timeToMinutes("22:00")).toBe(22 * 60);
      expect(timeToMinutes("23:59")).toBe(23 * 60 + 59);
    });

    it("handles edge cases and invalid inputs gracefully", () => {
      expect(timeToMinutes("")).toBe(0);
      expect(timeToMinutes("12")).toBe(12 * 60);
      expect(timeToMinutes("abc:def")).toBe(0);
      expect(timeToMinutes("12:abc")).toBe(12 * 60);
    });
  });

  describe("calculateStoreStatus", () => {
    const hours: OpeningHour[] = [
      { day: 0, open: "08:00", close: "20:00" }, // Sunday
      { day: 1, open: "07:00", close: "22:00" }, // Monday
      { day: 2, open: "07:00", close: "22:00" }, // Tuesday
    ];

    it("returns closed if no opening hours provided", () => {
      const now = new Date("2023-10-16T12:00:00"); // Monday 12:00 PM
      expect(calculateStoreStatus(null, now)).toEqual({ isOpen: false });
      expect(calculateStoreStatus([], now)).toEqual({ isOpen: false });
    });

    it("returns closed if no hours for the current day", () => {
      const now = new Date("2023-10-18T12:00:00"); // Wednesday 12:00 PM
      expect(calculateStoreStatus(hours, now)).toEqual({ isOpen: false });
    });

    it("returns open and closing time when currently open", () => {
      const now = new Date("2023-10-16T14:30:00"); // Monday 2:30 PM
      expect(calculateStoreStatus(hours, now)).toEqual({
        isOpen: true,
        closingTime: "22:00",
      });
    });

    it("returns closed when before opening time", () => {
      const now = new Date("2023-10-16T06:30:00"); // Monday 6:30 AM
      expect(calculateStoreStatus(hours, now)).toEqual({ isOpen: false });
    });

    it("returns closed when after closing time", () => {
      const now = new Date("2023-10-16T22:30:00"); // Monday 10:30 PM
      expect(calculateStoreStatus(hours, now)).toEqual({ isOpen: false });
    });
  });
});
