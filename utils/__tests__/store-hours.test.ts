import { getStoreOpenStatus } from "../store-hours";
import type { OpeningHour } from "~/lib/supabase/supabase-types";

describe("getStoreOpenStatus", () => {
  const mockOpeningHours: OpeningHour[] = [
    { day: 1, open: "09:00", close: "17:00" }, // Monday
    { day: 2, open: "09:00", close: "17:00" }, // Tuesday
    { day: 5, open: "10:00", close: "22:00" }, // Friday
    { day: 6, open: "22:00", close: "02:00" }, // Saturday night into Sunday
  ];

  it("returns closed for null or empty hours", () => {
    expect(getStoreOpenStatus(null)).toEqual({ isOpen: false });
    expect(getStoreOpenStatus([])).toEqual({ isOpen: false });
    expect(getStoreOpenStatus(undefined)).toEqual({ isOpen: false });
  });

  it("returns open with closing time when store is open (Monday 10:00)", () => {
    // 2024-01-01 is a Monday
    const date = new Date("2024-01-01T10:00:00");
    expect(getStoreOpenStatus(mockOpeningHours, date)).toEqual({
      isOpen: true,
      closingTime: "17:00",
    });
  });

  it("returns closed when store is closed (Monday 18:00)", () => {
    const date = new Date("2024-01-01T18:00:00");
    expect(getStoreOpenStatus(mockOpeningHours, date)).toEqual({ isOpen: false });
  });

  it("returns closed on a day with no opening hours (Wednesday 12:00)", () => {
    // 2024-01-03 is a Wednesday
    const date = new Date("2024-01-03T12:00:00");
    expect(getStoreOpenStatus(mockOpeningHours, date)).toEqual({ isOpen: false });
  });

  it("handles overnight hours correctly - before midnight (Saturday 23:00)", () => {
    // 2024-01-06 is a Saturday
    const date = new Date("2024-01-06T23:00:00");
    expect(getStoreOpenStatus(mockOpeningHours, date)).toEqual({
      isOpen: true,
      closingTime: "02:00",
    });
  });

  it("handles exact opening time", () => {
    const date = new Date("2024-01-01T09:00:00");
    expect(getStoreOpenStatus(mockOpeningHours, date)).toEqual({
      isOpen: true,
      closingTime: "17:00",
    });
  });

  it("handles exact closing time (should be closed)", () => {
    const date = new Date("2024-01-01T17:00:00");
    expect(getStoreOpenStatus(mockOpeningHours, date)).toEqual({
      isOpen: false,
    });
  });
});
