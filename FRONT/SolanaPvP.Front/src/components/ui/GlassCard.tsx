import React from "react";
import { cn } from "@/utils/cn";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glow" | "neon-border";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  glow?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = "default",
      padding = "md",
      hover = false,
      glow = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = "rounded-xl border transition-all duration-300";

    const variants = {
      default: "glass-card",
      glow: "glass-card-glow",
      "neon-border": "neon-border glass-card",
    };

    const paddings = {
      none: "p-0",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };

    const hoverClasses = hover
      ? "hover:shadow-glow hover:scale-[1.02] cursor-pointer"
      : "";

    const glowClasses = glow ? "shadow-glow" : "";

    return (
      <div
        className={cn(
          baseClasses,
          variants[variant],
          paddings[padding],
          hoverClasses,
          glowClasses,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

// Glass Card sub-components
const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
GlassCardHeader.displayName = "GlassCardHeader";

const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-txt-base",
      className
    )}
    {...props}
  />
));
GlassCardTitle.displayName = "GlassCardTitle";

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-txt-muted", className)} {...props} />
));
GlassCardDescription.displayName = "GlassCardDescription";

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent";

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
GlassCardFooter.displayName = "GlassCardFooter";

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
};
