import React, { useState, useRef, useEffect, useMemo } from "react";
import { useArenaStore } from "@/store/arenaStore";

interface TickerItem {
  id: string;
  text: string;
  type: "win" | "join" | "info";
}

interface TickerProps {
  className?: string;
  speed?: number;
  pauseOnHover?: boolean;
}

export const Ticker: React.FC<TickerProps> = ({
  className = "",
  speed = 230,
  pauseOnHover = true,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { feed } = useArenaStore();

  // Convert feed items to ticker items and memoize
  const displayTickerItems = useMemo(() => {
    const tickerItems: TickerItem[] = feed.map((item) => ({
      id: item.id,
      text: `🎉 ${item.username} won ${item.solAmount.toFixed(2)} SOL in ${
        item.gameMode
      }`,
      type: "win" as const,
    }));

    // If no feed items yet, show a placeholder message
    return tickerItems.length > 0
      ? tickerItems
      : [
          {
            id: "placeholder",
            text: "🎮 Welcome to Solana PvP Arena - Live matches will appear here",
            type: "info" as const,
          },
        ];
  }, [feed]);

  const itemsRef = useRef(displayTickerItems);

  // Update itemsRef when feed changes
  useEffect(() => {
    itemsRef.current = displayTickerItems;
  }, [displayTickerItems]);

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsPaused(false);
    }
  };

  // Calculate much faster speed (3.6x faster than original: 30 / 1.8 / 2 = ~8.33s)
  const baseSpeed = speed / 1.8;
  const animationSpeed = baseSpeed / 2; // Make it 2x faster than current

  // Use CSS animation for smoother, hardware-accelerated performance
  useEffect(() => {
    if (containerRef.current) {
      const styleId = "ticker-animation-style";
      // Remove existing style if any
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .ticker-animation {
          animation: ticker-scroll ${animationSpeed}s linear infinite;
          will-change: transform;
        }
        .ticker-paused {
          animation-play-state: paused !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        const styleToRemove = document.getElementById(styleId);
        if (styleToRemove) {
          document.head.removeChild(styleToRemove);
        }
      };
    }
  }, [animationSpeed]);

  // For seamless infinite animation without jumps, create 3 copies
  // This ensures smooth transition when looping back
  const displayItems = [
    ...itemsRef.current,
    ...itemsRef.current,
    ...itemsRef.current,
  ];

  return (
    <div
      className={`w-full z-40 bg-bg/80 backdrop-blur-sm border-t border-b border-white/10 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="overflow-hidden py-1">
        <div
          ref={containerRef}
          className={`flex whitespace-nowrap ticker-animation ${
            isPaused ? "ticker-paused" : ""
          }`}
          style={{ width: "fit-content" }}
        >
          {displayItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="ticker-item mr-8 flex-shrink-0"
            >
              <span
                className={`inline-flex items-center text-sm ${
                  item.type === "win"
                    ? "text-sol-mint"
                    : item.type === "join"
                    ? "text-sol-purple"
                    : "text-txt-muted"
                }`}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
