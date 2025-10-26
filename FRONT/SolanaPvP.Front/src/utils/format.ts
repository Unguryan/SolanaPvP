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
