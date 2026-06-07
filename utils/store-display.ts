import type { OpeningHour } from "~/lib/supabase/supabase-types";

/**
 * Display formatting utilities for store information.
 */

/**
 * Calculate the current open status and closing time for a store.
 *
 * @param openingHours - Array of opening hours for the store
 * @param date - Optional date to check against (defaults to now)
 * @returns Object containing isOpen boolean and optional closingTime string
 */
export function getStoreOpenStatus(
  openingHours: OpeningHour[] | null | undefined,
  date: Date = new Date()
): { isOpen: boolean; closingTime?: string } {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false, closingTime: undefined };
  }

  const currentDay = date.getDay(); // 0-6 (Sun-Sat)
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  const todayHours = openingHours.find((h) => h.day === currentDay);
  if (!todayHours) {
    return { isOpen: false, closingTime: undefined };
  }

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return (hours ?? 0) * 60 + (minutes ?? 0);
  };

  const openMinutes = parseTime(todayHours.open);
  let closeMinutes = parseTime(todayHours.close);

  if (closeMinutes < openMinutes) {
    closeMinutes += 24 * 60;
  }

  const isCurrentlyOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  return {
    isOpen: isCurrentlyOpen,
    closingTime: isCurrentlyOpen ? todayHours.close : undefined,
  };
}

/**
 * Format distance in kilometers to a human-readable string.
 * Shows meters for distances under 1km.
 *
 * @param km - Distance in kilometers
 * @returns Formatted distance string (e.g., "500m", "1.5km")
 */
export function formatDistance(km: number): string {
  if (km < 0) {
    throw new Error("Distance cannot be negative");
  }

  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }

  return `${km.toFixed(1)}km`;
}

/**
 * Format store open status to a human-readable string.
 *
 * @param isOpen - Whether the store is currently open
 * @param closingTime - Optional closing time in 24h format (e.g., "22:00")
 * @returns Formatted status string (e.g., "Open until 22:00", "Closed")
 */
export function formatOpenStatus(isOpen: boolean, closingTime?: string): string {
  if (isOpen) {
    return closingTime ? `Open until ${closingTime}` : "Open";
  }

  return "Closed";
}
