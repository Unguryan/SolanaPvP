// Falling emojis background effect
import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface FallingEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  delay: number;
}

interface FallingEmojisProps {
  className?: string;
  intensity?: "low" | "medium" | "high";
}

const EMOJIS = [
  "🎮",
  "⚡",
  "💎",
  "🔥",
  "⭐",
  "🌟",
  "💫",
  "✨",
  "🎯",
  "🏆",
  "💜",
  "💚",
  "💙",
  "❤️",
  "🧡",
  "💛",
  "🟣",
  "🔵",
  "🟢",
  "🟡",
  "🎲",
  "🎪",
  "🎨",
  "🎭",
  "🎪",
  "🎊",
  "🎉",
  "🎈",
  "🎁",
  "🎀",
  "💰",
  "💸",
  "💳",
  "💎",
  "🔮",
  "🎰",
  "🎲",
  "🃏",
  "♠️",
  "♥️",
  "♦️",
  "♣️",
  "🀄",
  "🎴",
  "🎯",
  "🏹",
  "🎪",
  "🎨",
  "🎭",
  "🎪",
];

export const FallingEmojis: React.FC<FallingEmojisProps> = ({
  className = "",
  intensity = "medium",
}) => {
  const [emojis, setEmojis] = useState<FallingEmoji[]>([]);

  const getIntensityConfig = useCallback(() => {
    switch (intensity) {
      case "low":
        return {
          count: 8,
          minSpeed: 8,
          maxSpeed: 12,
          minSize: 16,
          maxSize: 24,
        };
      case "medium":
        return {
          count: 15,
          minSpeed: 10,
          maxSpeed: 15,
          minSize: 20,
          maxSize: 32,
        };
      case "high":
        return {
          count: 25,
          minSpeed: 12,
          maxSpeed: 18,
          minSize: 24,
          maxSize: 40,
        };
      default:
        return {
          count: 15,
          minSpeed: 10,
          maxSpeed: 15,
          minSize: 20,
          maxSize: 32,
        };
    }
  }, [intensity]);

  const createEmoji = useCallback((): FallingEmoji => {
    const config = getIntensityConfig();
    return {
      id: Math.random().toString(36).substr(2, 9),
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: Math.random() * 100, // 0-100% of screen width
      y: -50, // Start above screen
      size: Math.random() * (config.maxSize - config.minSize) + config.minSize,
      speed:
        Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed,
      rotation: Math.random() * 360,
      delay: Math.random() * 2, // Random delay 0-2s
    };
  }, [getIntensityConfig]);

  useEffect(() => {
    const config = getIntensityConfig();

    // Create initial emojis
    const initialEmojis = Array.from({ length: config.count }, createEmoji);
    setEmojis(initialEmojis);

    // Add new emojis periodically
    const interval = setInterval(() => {
      setEmojis((prev) => {
        // Remove emojis that are off screen and add new ones
        const filtered = prev.filter(
          (emoji) => emoji.y < window.innerHeight + 100
        );
        const newEmojis = Array.from(
          { length: Math.floor(config.count / 3) },
          createEmoji
        );
        return [...filtered, ...newEmojis];
      });
    }, 2000); // Add new emojis every 2 seconds

    return () => clearInterval(interval);
  }, [intensity, createEmoji, getIntensityConfig]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}
    >
      {emojis.map((emoji) => (
        <motion.div
          key={emoji.id}
          className="absolute select-none blur-sm"
          style={{
            left: `${emoji.x}%`,
            top: emoji.y,
            fontSize: `${emoji.size}px`,
            transform: `rotate(${emoji.rotation}deg)`,
          }}
          initial={{ y: -50, opacity: 0 }}
          animate={{
            y: window.innerHeight + 100,
            opacity: [0, 0.3, 0.3, 0],
            rotate: emoji.rotation + 360,
          }}
          transition={{
            duration: emoji.speed,
            delay: emoji.delay,
            ease: "linear",
            opacity: {
              times: [0, 0.1, 0.9, 1],
              duration: emoji.speed,
            },
          }}
        >
          {emoji.emoji}
        </motion.div>
      ))}
    </div>
  );
};
