import type { OpeningHour } from "~/lib/supabase/supabase-types";

export interface StoreOpenStatus {
  isOpen: boolean;
  closingTime?: string;
}

/**
 * Calculates whether a store is currently open and its closing time based on opening hours.
 *
 * @param openingHours Array of opening hours for the store
 * @param date Optional date to check against (defaults to current time)
 * @returns Object containing isOpen boolean and optional closingTime string
 */
export function checkStoreOpenStatus(
  openingHours: OpeningHour[] | null | undefined,
  date: Date = new Date()
): StoreOpenStatus {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false };
  }

  const currentDay = date.getDay(); // 0-6, 0 = Sunday
  const currentHour = date.getHours();
  const currentMinute = date.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Find today's hours
  const todayHours = openingHours.find((h) => h.day === currentDay);

  // Find yesterday's hours to check if we're in the early morning of a late closing
  const previousDay = (currentDay + 6) % 7;
  const yesterdayHours = openingHours.find((h) => h.day === previousDay);

  // Check if still open from yesterday (e.g. yesterday open 08:00, close 02:00 next day)
  if (yesterdayHours) {
    const [yOpenHourStr, yOpenMinStr] = yesterdayHours.open.split(":");
    const [yCloseHourStr, yCloseMinStr] = yesterdayHours.close.split(":");
    const [yOpenHour, yOpenMin] = [Number(yOpenHourStr), Number(yOpenMinStr)];
    const [yCloseHour, yCloseMin] = [Number(yCloseHourStr), Number(yCloseMinStr)];

    // Valid format check
    if (!isNaN(yOpenHour) && !isNaN(yCloseHour)) {
      const yCloseTimeInMinutes = yCloseHour * 60 + yCloseMin;
      const yOpenTimeInMinutes = yOpenHour * 60 + yOpenMin;

      // If closing time is before opening time, it means it closes the next day
      if (
        yCloseTimeInMinutes < yOpenTimeInMinutes ||
        (yCloseTimeInMinutes === yOpenTimeInMinutes && yCloseMin < yOpenMin)
      ) {
        if (currentTimeInMinutes < yCloseTimeInMinutes) {
          return { isOpen: true, closingTime: yesterdayHours.close };
        }
      }
    }
  }

  // Check today's hours
  if (todayHours) {
    const [openHourStr, openMinStr] = todayHours.open.split(":");
    const [closeHourStr, closeMinStr] = todayHours.close.split(":");
    const [openHour, openMin] = [Number(openHourStr), Number(openMinStr)];
    const [closeHour, closeMin] = [Number(closeHourStr), Number(closeMinStr)];

    // Valid format check
    if (!isNaN(openHour) && !isNaN(closeHour)) {
      const openTimeInMinutes = openHour * 60 + openMin;
      const closeTimeInMinutes = closeHour * 60 + closeMin;

      // Closes same day
      if (closeTimeInMinutes >= openTimeInMinutes) {
        if (
          currentTimeInMinutes >= openTimeInMinutes &&
          currentTimeInMinutes < closeTimeInMinutes
        ) {
          return { isOpen: true, closingTime: todayHours.close };
        }
      }
      // Closes next day
      else {
        if (currentTimeInMinutes >= openTimeInMinutes) {
          return { isOpen: true, closingTime: todayHours.close };
        }
      }
    }
  }

  return { isOpen: false };
}
