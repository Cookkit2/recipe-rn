import { formatDuration as dateFnsFormatDuration, intervalToDuration } from "date-fns";

/**
 * Formats duration from milliseconds to readable format using date-fns
 * Example: formatDuration(125000) -> "2 minutes 5 seconds"
 */
export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) return "less than a second";

  // Get exact breakdown of the duration
  const duration = intervalToDuration({ start: 0, end: milliseconds });

  // Use date-fns formatDuration to create the human readable string
  return dateFnsFormatDuration(duration) || "less than a second";
};

export const formatSyncTime = (ts: number | null): string => {
  if (!ts) return "Never";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};
