// Card component
import React from "react";
import { cn } from "@/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined" | "elevated" | "glass" | "neon";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  glow?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
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
    const baseClasses = "rounded-lg border transition-all duration-200";

    const variants = {
      default: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
      outlined: "bg-transparent border-gray-300 dark:border-gray-600",
      elevated:
        "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg",
      glass: "glass-card",
      neon: "neon-border glass-card",
    };

    const paddings = {
      none: "p-0",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };

    const hoverClasses = hover
      ? "hover:shadow-lg hover:scale-105 cursor-pointer"
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

Card.displayName = "Card";

// Card sub-components
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
