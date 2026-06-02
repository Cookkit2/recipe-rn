import { checkStoreOpenStatus } from "../../utils/store-hours";
import type { OpeningHour } from "../../lib/supabase/supabase-types";

describe("checkStoreOpenStatus", () => {
  const mockHours: OpeningHour[] = [
    { day: 1, open: "08:00", close: "22:00" }, // Monday
    { day: 2, open: "08:00", close: "02:00" }, // Tuesday (closes Wed 2am)
    { day: 5, open: "09:30", close: "18:45" }, // Friday
  ];

  it("returns closed for null/empty hours", () => {
    expect(checkStoreOpenStatus(null)).toEqual({ isOpen: false });
    expect(checkStoreOpenStatus([])).toEqual({ isOpen: false });
  });

  it("returns open when within same-day hours", () => {
    // Monday 12:00
    const localDate = new Date();
    localDate.setFullYear(2023, 9, 23); // Oct 23, 2023 is Monday
    localDate.setHours(12, 0, 0, 0);

    expect(checkStoreOpenStatus(mockHours, localDate)).toEqual({
      isOpen: true,
      closingTime: "22:00",
    });
  });

  it("returns closed when before opening time", () => {
    const localDate = new Date();
    localDate.setFullYear(2023, 9, 23); // Monday
    localDate.setHours(7, 0, 0, 0);

    expect(checkStoreOpenStatus(mockHours, localDate)).toEqual({ isOpen: false });
  });

  it("returns closed when after closing time", () => {
    const localDate = new Date();
    localDate.setFullYear(2023, 9, 23); // Monday
    localDate.setHours(23, 0, 0, 0);

    expect(checkStoreOpenStatus(mockHours, localDate)).toEqual({ isOpen: false });
  });

  it("handles next-day closing (during first day)", () => {
    const localDate = new Date();
    localDate.setFullYear(2023, 9, 24); // Tuesday
    localDate.setHours(23, 0, 0, 0);

    expect(checkStoreOpenStatus(mockHours, localDate)).toEqual({
      isOpen: true,
      closingTime: "02:00",
    });
  });

  it("handles next-day closing (during early hours of next day)", () => {
    const localDate = new Date();
    localDate.setFullYear(2023, 9, 25); // Wednesday
    localDate.setHours(1, 0, 0, 0);

    expect(checkStoreOpenStatus(mockHours, localDate)).toEqual({
      isOpen: true,
      closingTime: "02:00",
    });
  });

  it("handles next-day closing (after closing on next day)", () => {
    const localDate = new Date();
    localDate.setFullYear(2023, 9, 25); // Wednesday
    localDate.setHours(3, 0, 0, 0);

    expect(checkStoreOpenStatus(mockHours, localDate)).toEqual({ isOpen: false });
  });
});
