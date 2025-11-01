// Network indicator badge component
import React from "react";
import { isDevnet, getNetworkName } from "@/services/solana/config";

interface NetworkBadgeProps {
  /**
   * Size variant of the badge
   * @default "sm"
   */
  size?: "xs" | "sm" | "md";

  /**
   * Show full network name or just "(dev)"
   * @default false
   */
  showFullName?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show on mainnet too
   * @default false
   */
  showOnMainnet?: boolean;
}

/**
 * NetworkBadge - Display current network indicator
 *
 * Usage:
 * ```tsx
 * // Simple devnet indicator
 * <NetworkBadge />
 *
 * // Show full name
 * <NetworkBadge showFullName />
 *
 * // Always show (even on mainnet)
 * <NetworkBadge showOnMainnet />
 * ```
 */
export const NetworkBadge: React.FC<NetworkBadgeProps> = ({
  size = "sm",
  showFullName = false,
  className = "",
  showOnMainnet = false,
}) => {
  const isDev = isDevnet();

  // Don't show on mainnet unless explicitly requested
  if (!isDev && !showOnMainnet) {
    return null;
  }

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
  };

  const text = showFullName
    ? getNetworkName()
    : isDev
    ? "(devnet)"
    : "(mainnet)";

  const colorClasses = isDev
    ? "text-sol-mint bg-sol-mint/10 border-sol-mint/20"
    : "text-sol-purple bg-sol-purple/10 border-sol-purple/20";

  return (
    <span
      className={`
        font-semibold rounded-md border
        ${sizeClasses[size]}
        ${colorClasses}
        ${className}
      `}
      title={`Network: ${getNetworkName()}`}
    >
      {text}
    </span>
  );
};

/**
 * NetworkIndicator - Inline text indicator
 * Shows "Devnet" or "Mainnet" as inline text
 */
export const NetworkIndicator: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const network = getNetworkName();
  const isDev = isDevnet();

  return (
    <span
      className={`
        font-medium
        ${isDev ? "text-sol-mint" : "text-sol-purple"}
        ${className}
      `}
    >
      {network}
    </span>
  );
};

/**
 * NetworkDot - Simple colored dot indicator
 */
export const NetworkDot: React.FC<{
  className?: string;
  showLabel?: boolean;
}> = ({ className = "", showLabel = false }) => {
  const isDev = isDevnet();
  const network = getNetworkName();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`
          w-2 h-2 rounded-full
          ${isDev ? "bg-sol-mint" : "bg-sol-purple"}
        `}
        title={`Network: ${network}`}
      />
      {showLabel && <span className="text-xs text-txt-muted">{network}</span>}
    </div>
  );
};
