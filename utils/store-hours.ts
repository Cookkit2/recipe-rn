import type { OpeningHour } from "~/lib/supabase/supabase-types";

/**
 * Checks if a store is currently open and returns its closing time.
 * @param openingHours Array of opening hours for the store
 * @param currentDate Current date (defaults to new Date())
 * @returns Object containing isOpen boolean and optional closingTime string
 */
export function getStoreOpenStatus(
  openingHours: OpeningHour[] | null | undefined,
  currentDate: Date = new Date()
): { isOpen: boolean; closingTime?: string } {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false };
  }

  const currentDay = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();

  const todayHours = openingHours.find((hours) => hours.day === currentDay);

  if (!todayHours) {
    return { isOpen: false };
  }

  // Parse "HH:MM" format
  const [openHourStr, openMinuteStr] = todayHours.open.split(":");
  const [closeHourStr, closeMinuteStr] = todayHours.close.split(":");

  if (!openHourStr || !openMinuteStr || !closeHourStr || !closeMinuteStr) {
    return { isOpen: false };
  }

  const openHour = parseInt(openHourStr, 10);
  const openMinute = parseInt(openMinuteStr, 10);
  const closeHour = parseInt(closeHourStr, 10);
  const closeMinute = parseInt(closeMinuteStr, 10);

  const currentTimeInMinutes = currentHours * 60 + currentMinutes;
  const openTimeInMinutes = openHour * 60 + openMinute;
  const closeTimeInMinutes = closeHour * 60 + closeMinute;

  let isOpen = false;

  // Handle overnight hours (e.g. 22:00 to 02:00)
  if (closeTimeInMinutes < openTimeInMinutes) {
    isOpen = currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes < closeTimeInMinutes;
  } else {
    // Normal hours (e.g. 09:00 to 22:00)
    isOpen = currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes;
  }

  return {
    isOpen,
    closingTime: todayHours.close,
  };
}
