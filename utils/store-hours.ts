import type { OpeningHour } from "~/lib/supabase/supabase-types";

/**
 * Calculates whether a store is currently open based on its opening hours.
 *
 * @param openingHours - Array of OpeningHour objects
 * @param currentDate - Date object representing the current time (defaults to now)
 * @returns Object indicating if the store is open and its closing time if open
 */
export function getStoreOpenStatus(
  openingHours: OpeningHour[] | null | undefined,
  currentDate: Date = new Date()
): { isOpen: boolean; closingTime?: string } {
  // If no hours are provided, assume it's open (fallback)
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: true };
  }

  const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Find hours for today
  const todayHours = openingHours.find((h) => h.day === currentDay);

  // If no hours defined for today, store is closed
  if (!todayHours) {
    return { isOpen: false };
  }

  // Format current time as HH:MM for easy comparison
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();
  const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

  // Handle overnight hours (e.g., open at 10:00, close at 02:00)
  if (todayHours.close < todayHours.open) {
    const isOpen = currentTimeStr >= todayHours.open || currentTimeStr < todayHours.close;
    return {
      isOpen,
      closingTime: isOpen ? todayHours.close : undefined,
    };
  }

  // Standard daytime hours
  const isOpen = currentTimeStr >= todayHours.open && currentTimeStr < todayHours.close;

  return {
    isOpen,
    closingTime: isOpen ? todayHours.close : undefined,
  };
}
