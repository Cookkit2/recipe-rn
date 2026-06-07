import { getStoreOpeningStatus } from "../store-hours";
import type { OpeningHour } from "~/lib/supabase/supabase-types";

describe("store-hours", () => {
  const mockHours: OpeningHour[] = [
    { day: 0, open: "08:00", close: "22:00" }, // Sunday
    { day: 1, open: "09:00", close: "17:00" }, // Monday
  ];

  it("should return false if no opening hours provided", () => {
    expect(getStoreOpeningStatus(null)).toEqual({ isOpen: false });
    expect(getStoreOpeningStatus([])).toEqual({ isOpen: false });
    expect(getStoreOpeningStatus(undefined)).toEqual({ isOpen: false });
  });

  it("should return false if store has no hours for current day", () => {
    // Tuesday (day 2)
    const now = new Date("2023-10-24T12:00:00Z");
    expect(getStoreOpeningStatus(mockHours, now)).toEqual({ isOpen: false });
  });

  it("should return true and closing time if store is currently open", () => {
    // Monday at 12:00
    const now = new Date("2023-10-23T12:00:00Z");
    expect(getStoreOpeningStatus(mockHours, now)).toEqual({ isOpen: true, closingTime: "17:00" });
  });

  it("should return false if store is not yet open", () => {
    // Monday at 08:00
    const now = new Date("2023-10-23T08:00:00Z");
    expect(getStoreOpeningStatus(mockHours, now)).toEqual({ isOpen: false });
  });

  it("should return false if store is already closed", () => {
    // Monday at 18:00
    const now = new Date("2023-10-23T18:00:00Z");
    expect(getStoreOpeningStatus(mockHours, now)).toEqual({ isOpen: false });
  });

  it("should handle 24/7 stores", () => {
    const twentyFourSevenHours: OpeningHour[] = [{ day: 1, open: "00:00", close: "23:59" }];
    const now = new Date("2023-10-23T03:00:00Z");
    expect(getStoreOpeningStatus(twentyFourSevenHours, now)).toEqual({
      isOpen: true,
      closingTime: "23:59",
    });
  });
});
