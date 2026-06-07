import type { OpeningHour } from "~/lib/supabase/supabase-types";

/**
 * Checks if a store is currently open based on its opening hours and current time.
 * Handles stores that are open past midnight.
 *
 * @param openingHours - Array of opening hours for the store
 * @param currentDate - Current date/time to check against (defaults to now)
 * @returns Object containing isOpen boolean and optional closingTime string
 */
export function checkStoreOpenStatus(
  openingHours: OpeningHour[] | null,
  currentDate: Date = new Date()
): { isOpen: boolean; closingTime?: string } {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: false };
  }

  const currentDay = currentDate.getDay(); // 0-6 (Sun-Sat)
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // Check today's hours
  const todaysHours = openingHours.find((h) => h.day === currentDay);
  if (todaysHours) {
    const [openH, openM] = todaysHours.open.split(":").map(Number);
    const [closeH, closeM] = todaysHours.close.split(":").map(Number);

    // Use non-null assertions to fix TS2532 (possibly undefined)
    const openTimeInMinutes = openH! * 60 + (openM || 0);
    const closeTimeInMinutes = closeH! * 60 + (closeM || 0);

    if (closeTimeInMinutes < openTimeInMinutes) {
      // Closes next day (e.g. open 20:00, close 02:00)
      if (currentTimeInMinutes >= openTimeInMinutes) {
        return { isOpen: true, closingTime: todaysHours.close };
      }
    } else {
      // Standard hours (e.g. open 09:00, close 17:00)
      if (currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes < closeTimeInMinutes) {
        return { isOpen: true, closingTime: todaysHours.close };
      }
    }
  }

  // Check yesterday's hours for overnight overlap
  const yesterdayDay = currentDay === 0 ? 6 : currentDay - 1;
  const yesterdaysHours = openingHours.find((h) => h.day === yesterdayDay);
  if (yesterdaysHours) {
    const [openH, openM] = yesterdaysHours.open.split(":").map(Number);
    const [closeH, closeM] = yesterdaysHours.close.split(":").map(Number);

    const openTimeInMinutes = openH! * 60 + (openM || 0);
    const closeTimeInMinutes = closeH! * 60 + (closeM || 0);

    // If yesterday's hours extended past midnight
    if (closeTimeInMinutes < openTimeInMinutes) {
      if (currentTimeInMinutes < closeTimeInMinutes) {
        return { isOpen: true, closingTime: yesterdaysHours.close };
      }
    }
  }

  return { isOpen: false };
}
