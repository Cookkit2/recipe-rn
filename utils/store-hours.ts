import type { OpeningHour } from "~/lib/supabase/supabase-types";

/**
 * Check if a store is currently open based on its opening hours.
 *
 * @param openingHours - Array of opening hours for the store
 * @param date - Optional date to check against (defaults to current date/time)
 * @returns Object containing isOpen boolean and optional closingTime string
 */
export function getStoreOpenStatus(
  openingHours: OpeningHour[] | null | undefined,
  date: Date = new Date()
): { isOpen: boolean; closingTime?: string } {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false };
  }

  const currentDay = date.getDay();
  const currentHours = date.getHours();
  const currentMinutes = date.getMinutes();
  const currentTimeStr = `${currentHours.toString().padStart(2, "0")}:${currentMinutes.toString().padStart(2, "0")}`;

  // Find opening hours for today
  const todayHours = openingHours.filter((h) => h.day === currentDay);

  if (todayHours.length === 0) {
    return { isOpen: false };
  }

  for (const hours of todayHours) {
    if (currentTimeStr >= hours.open && currentTimeStr < hours.close) {
      return { isOpen: true, closingTime: hours.close };
    }

    // Handle overnight hours (e.g. 22:00 - 02:00) where open > close
    if (
      hours.open > hours.close &&
      (currentTimeStr >= hours.open || currentTimeStr < hours.close)
    ) {
      return { isOpen: true, closingTime: hours.close };
    }
  }

  return { isOpen: false };
}
