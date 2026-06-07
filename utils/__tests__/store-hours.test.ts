import { getStoreOpenStatus } from "../store-hours";
import type { OpeningHour } from "~/lib/supabase/supabase-types";

describe("getStoreOpenStatus", () => {
  it("returns open when no hours are provided", () => {
    expect(getStoreOpenStatus(null)).toEqual({ isOpen: true });
    expect(getStoreOpenStatus([])).toEqual({ isOpen: true });
  });

  it("returns closed when no hours match the current day", () => {
    // Current date is Sunday (0)
    const sundayDate = new Date("2023-10-01T12:00:00Z"); // Oct 1, 2023 is a Sunday
    const hours: OpeningHour[] = [
      { day: 1, open: "08:00", close: "20:00" }, // Monday
    ];

    expect(getStoreOpenStatus(hours, sundayDate)).toEqual({ isOpen: false });
  });

  it("returns open with closing time when current time is within standard hours", () => {
    // Current date is Sunday (0), 14:00 (2 PM)
    const sundayDate = new Date("2023-10-01T14:00:00");
    const hours: OpeningHour[] = [
      { day: 0, open: "08:00", close: "20:00" }, // Sunday
    ];

    expect(getStoreOpenStatus(hours, sundayDate)).toEqual({
      isOpen: true,
      closingTime: "20:00",
    });
  });

  it("returns closed when current time is outside standard hours", () => {
    // Current date is Sunday (0), 21:00 (9 PM)
    const sundayDate = new Date("2023-10-01T21:00:00");
    const hours: OpeningHour[] = [
      { day: 0, open: "08:00", close: "20:00" }, // Sunday
    ];

    expect(getStoreOpenStatus(hours, sundayDate)).toEqual({ isOpen: false });
  });

  it("handles overnight hours correctly (open)", () => {
    // Current date is Sunday (0), 01:00 (1 AM)
    const sundayDate = new Date("2023-10-01T01:00:00");
    const hours: OpeningHour[] = [
      { day: 0, open: "20:00", close: "02:00" }, // Sunday night to Monday morning
    ];

    expect(getStoreOpenStatus(hours, sundayDate)).toEqual({
      isOpen: true,
      closingTime: "02:00",
    });
  });
});
