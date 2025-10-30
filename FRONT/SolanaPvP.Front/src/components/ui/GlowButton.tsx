import React from "react";
import { cn } from "@/utils/cn";

export interface GlowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "neon" | "glass" | "ghost" | "purple" | "mint" | "orange" | "blue";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  breathing?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
  (
    {
      className,
      variant = "neon",
      size = "md",
      glow = true,
      breathing = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden";

    const variants = {
      neon: "bg-gradient-to-r from-sol-purple to-sol-mint text-white font-semibold hover:scale-105",
      glass: "glass-card text-txt-base font-medium hover:bg-white/10",
      ghost: "bg-transparent text-txt-base font-medium hover:bg-white/5",
      purple:
        "bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold hover:scale-105",
      mint: "bg-gradient-to-r from-green-400 to-emerald-600 text-white font-semibold hover:scale-105",
      orange:
        "bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:scale-105",
      blue: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:scale-105",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    const glowClasses = glow ? "shadow-glow hover:shadow-glow-strong" : "";
    const breathingClasses = breathing ? "animate-pulse-breath" : "";

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          glowClasses,
          breathingClasses,
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}

        {children}

        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}

        {/* Neon glow overlay for neon variant */}
        {variant === "neon" && (
          <div className="absolute inset-0 bg-gradient-to-r from-sol-purple to-sol-mint opacity-0 hover:opacity-20 transition-opacity duration-300 rounded-2xl" />
        )}
      </button>
    );
  }
);

GlowButton.displayName = "GlowButton";

export { GlowButton };
