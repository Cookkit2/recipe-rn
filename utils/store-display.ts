/**
 * Display formatting utilities for store information.
 */

/**
 * Format distance in kilometers to a human-readable string.
 * Shows meters for distances under 1km.
 *
 * @param km - Distance in kilometers
 * @returns Formatted distance string (e.g., "500m away", "1.5km away")
 */
export function formatDistance(km: number): string {
  if (km < 0) {
    throw new Error("Distance cannot be negative");
  }

  if (km < 1) {
    return `${Math.round(km * 1000)}m away`;
  }

  return `${km.toFixed(1)}km away`;
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
