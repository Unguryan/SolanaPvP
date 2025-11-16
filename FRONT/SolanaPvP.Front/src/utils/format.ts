// Formatting utilities
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, "HH:mm")}`;
  }

  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, "HH:mm")}`;
  }

  return format(dateObj, "MMM d, yyyy HH:mm");
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

// Parse a UTC-ish date value into milliseconds since epoch
// Accepts ISO string (with or without Z) or Date instance
export function parseUtc(date: string | Date | undefined | null): number | null {
  if (!date) return null;
  if (date instanceof Date) return date.getTime();

  const timestamp = Date.parse(date);
  return Number.isNaN(timestamp) ? null : timestamp;
}

// Compute remaining seconds from a UTC start time and duration, using local clock only for diff
export function getRemainingSecondsUtc(
  start: string | Date | undefined | null,
  durationSec: number
): number {
  const startMs = parseUtc(start);
  if (startMs == null || !Number.isFinite(durationSec) || durationSec <= 0) {
    return 0;
  }

  const nowMs = Date.now();
  const elapsedSec = (nowMs - startMs) / 1000;
  const remaining = Math.ceil(durationSec - elapsedSec);
  return remaining > 0 ? remaining : 0;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${remainingSeconds}s`;
}

export function truncateAddress(
  address: string,
  start: number = 4,
  end: number = 4
): string {
  if (address.length <= start + end) {
    return address;
  }

  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
