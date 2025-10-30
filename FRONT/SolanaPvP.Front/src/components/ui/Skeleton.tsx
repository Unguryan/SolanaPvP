import React from "react";
import { cn } from "@/utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "shimmer" | "none";
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = "rectangular",
      width,
      height,
      animation = "shimmer",
      ...props
    },
    ref
  ) => {
    const baseClasses = "bg-white/10 rounded";

    const variants = {
      text: "h-4 w-full",
      rectangular: "w-full",
      circular: "rounded-full",
    };

    const animations = {
      pulse: "animate-pulse",
      shimmer:
        "animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent",
      none: "",
    };

    const style = {
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
    };

    return (
      <div
        className={cn(
          baseClasses,
          variants[variant],
          animations[animation],
          className
        )}
        style={style}
        ref={ref}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Skeleton sub-components for common patterns
const SkeletonText = React.forwardRef<
  HTMLDivElement,
  Omit<SkeletonProps, "variant"> & { lines?: number }
>(({ lines = 1, className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={cn(
          i === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
          className
        )}
      />
    ))}
  </div>
));
SkeletonText.displayName = "SkeletonText";

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("glass-card p-4 space-y-3", className)}
      {...props}
    >
      <Skeleton variant="text" className="h-6 w-1/3" />
      <SkeletonText lines={2} />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
);
SkeletonCard.displayName = "SkeletonCard";

const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="circular"
      width={40}
      height={40}
      className={cn(className)}
      {...props}
    />
  )
);
SkeletonAvatar.displayName = "SkeletonAvatar";

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar };
