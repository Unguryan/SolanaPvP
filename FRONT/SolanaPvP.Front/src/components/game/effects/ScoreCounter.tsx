// Animated score counter component
import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface ScoreCounterProps {
  value: number;
  duration?: number;
  className?: string;
  onComplete?: () => void;
}

export const ScoreCounter: React.FC<ScoreCounterProps> = ({
  value,
  duration = 1,
  className = "",
  onComplete,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
  });

  const animatedValue = useTransform(spring, (current) => Math.round(current));

  useEffect(() => {
    if (value === 0) return;

    setIsAnimating(true);
    spring.set(value);

    // Update display value
    const unsubscribe = animatedValue.on("change", (latest) => {
      setDisplayValue(latest);
    });

    // Complete animation
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, duration * 1000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]); // УБРАЛ spring, animatedValue, onComplete - они вызывают бесконечный цикл!

  const getColorClass = () => {
    if (value >= 1000) return "text-sol-purple";
    if (value >= 500) return "text-sol-mint";
    return "text-txt-base";
  };

  const getGlowClass = () => {
    if (value >= 1000) return "shadow-glow-purple";
    if (value >= 500) return "shadow-glow-mint";
    return "shadow-glow";
  };

  return (
    <motion.div
      className={`font-bold text-2xl ${getColorClass()} ${className}`}
      style={{
        filter: `drop-shadow(0 0 10px ${
          value >= 1000 ? "#9945FF" : value >= 500 ? "#14F195" : "currentColor"
        })`,
      }}
      animate={
        isAnimating
          ? {
              scale: [1, 1.1, 1],
            }
          : {}
      }
      transition={{
        duration: 0.5,
        repeat: isAnimating ? Infinity : 0,
        repeatType: "reverse",
      }}
    >
      {displayValue.toLocaleString()}
    </motion.div>
  );
};
