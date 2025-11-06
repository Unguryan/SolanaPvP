import { formatDistanceToNow } from "date-fns";

/**
 * Format UTC date string to localized display
 */
export const formatUTCDate = (utcDateString: string): string => {
  const date = new Date(utcDateString);
  return date.toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });
};

/**
 * Format UTC date as "time ago" (e.g. "5 minutes ago")
 * Ensures UTC parsing by adding 'Z' if not present
 */
export const formatTimeAgo = (utcDateString: string): string => {
  // Ensure the string is treated as UTC
  const dateStr = utcDateString.endsWith("Z") ? utcDateString : `${utcDateString}Z`;
  const date = new Date(dateStr);
  return formatDistanceToNow(date, { addSuffix: true });
};

/**
 * Format Unix timestamp (seconds) to "time ago"
 */
export const formatTimestampAgo = (timestampSeconds: number): string => {
  const date = new Date(timestampSeconds * 1000);
  return formatDistanceToNow(date, { addSuffix: true });
};

