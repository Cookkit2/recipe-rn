import { checkStoreOpenStatus } from "../store-status";
import type { OpeningHour } from "~/lib/supabase/supabase-types";

describe("checkStoreOpenStatus", () => {
  it("returns closed for null or empty hours", () => {
    expect(checkStoreOpenStatus(null)).toEqual({ isOpen: false });
    expect(checkStoreOpenStatus([])).toEqual({ isOpen: false });
  });

  it("handles standard opening hours correctly", () => {
    const hours: OpeningHour[] = [{ day: 1, open: "09:00", close: "17:00" }];

    // Monday 12:00
    expect(checkStoreOpenStatus(hours, new Date("2023-10-09T12:00:00"))).toEqual({
      isOpen: true,
      closingTime: "17:00",
    });

    // Monday 18:00
    expect(checkStoreOpenStatus(hours, new Date("2023-10-09T18:00:00"))).toEqual({
      isOpen: false,
    });
  });

  it("handles overnight opening hours same day", () => {
    const hours: OpeningHour[] = [{ day: 1, open: "20:00", close: "02:00" }];

    // Monday 22:00
    expect(checkStoreOpenStatus(hours, new Date("2023-10-09T22:00:00"))).toEqual({
      isOpen: true,
      closingTime: "02:00",
    });
  });

  it("handles overnight opening hours next day", () => {
    const hours: OpeningHour[] = [{ day: 1, open: "20:00", close: "02:00" }];

    // Tuesday 01:00
    expect(checkStoreOpenStatus(hours, new Date("2023-10-10T01:00:00"))).toEqual({
      isOpen: true,
      closingTime: "02:00",
    });

    // Tuesday 03:00
    expect(checkStoreOpenStatus(hours, new Date("2023-10-10T03:00:00"))).toEqual({
      isOpen: false,
    });
  });

  it("handles Sunday to Monday overnight correctly", () => {
    const hours: OpeningHour[] = [{ day: 0, open: "20:00", close: "02:00" }];

    // Monday 01:00
    expect(checkStoreOpenStatus(hours, new Date("2023-10-09T01:00:00"))).toEqual({
      isOpen: true,
      closingTime: "02:00",
    });
  });
});
