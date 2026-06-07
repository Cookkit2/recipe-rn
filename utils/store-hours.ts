import { format } from "date-fns";
import type { OpeningHour } from "~/lib/supabase/supabase-types";

/**
 * Calculates whether a store is currently open and returns its closing time if open.
 *
 * @param openingHours - Array of store opening hours
 * @param now - Current date/time (defaults to new Date())
 * @returns Object containing isOpen boolean and optional closingTime string
 */
export function getStoreOpeningStatus(
  openingHours: OpeningHour[] | null | undefined,
  now = new Date()
): { isOpen: boolean; closingTime?: string } {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false };
  }

  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Find hours for today
  const todaysHours = openingHours.find((h) => h.day === currentDay);

  if (!todaysHours) {
    return { isOpen: false };
  }

  const currentTime = format(now, "HH:mm");

  // Handle case where store is open 24 hours
  if (todaysHours.open === "00:00" && todaysHours.close === "23:59") {
    return { isOpen: true, closingTime: "23:59" };
  }

  // Check if current time is within open and close times
  const isOpen = currentTime >= todaysHours.open && currentTime < todaysHours.close;

  return {
    isOpen,
    closingTime: isOpen ? todaysHours.close : undefined,
  };
}
