import type { OpeningHour } from "~/lib/supabase/supabase-types";

/**
 * Parses a time string "HH:MM" to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Calculates store open status and closing time based on current time and opening hours
 */
export function calculateStoreStatus(
  openingHours: OpeningHour[] | null,
  now = new Date()
): { isOpen: boolean; closingTime?: string } {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false };
  }

  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find today's hours
  const todayHours = openingHours.find((h) => h.day === currentDay);

  if (!todayHours) {
    return { isOpen: false };
  }

  const openMinutes = timeToMinutes(todayHours.open);
  const closeMinutes = timeToMinutes(todayHours.close);

  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return { isOpen: true, closingTime: todayHours.close };
  }

  return { isOpen: false };
}
