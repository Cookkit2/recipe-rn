import { formatDistanceStrict } from "date-fns";

/**
 * Formats duration from milliseconds to readable format using date-fns
 * Example: formatDuration(125000) -> "2 minutes 5 seconds"
 */
export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) return "less than a second";

  // Create two dates with the duration between them
  const startDate = new Date(0);
  const endDate = new Date(milliseconds);

  // Use date-fns formatDistanceStrict for precise formatting
  return formatDistanceStrict(startDate, endDate, {
    unit: "second",
    roundingMethod: "floor",
  });
};
