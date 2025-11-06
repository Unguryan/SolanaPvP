import React, { useRef, useEffect, useMemo } from "react";
import { motion, useAnimationControls } from "framer-motion";
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
  speed = 230, // eslint-disable-line @typescript-eslint/no-unused-vars
  pauseOnHover = true, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const { feed } = useArenaStore();

  // Convert feed items to ticker items and memoize
  const displayTickerItems = useMemo(() => {
    console.log("[Ticker] Feed items:", feed);
    const tickerItems: TickerItem[] = feed.map((item) => {
      console.log("[Ticker] Processing item:", item);
      console.log("[Ticker] Username:", item.username);
      
      // Truncate username to 12 characters
      const username = item.username && item.username.length > 12 
        ? item.username.substring(0, 12) + "..." 
        : item.username;
      
      // For team matches, show team indicator
      const teamText = item.matchType !== "OneVOne" && item.matchType !== "Solo"
        ? ` (Team ${item.winnerSide + 1})` 
        : "";
      
      return {
        id: item.id,
        text: `${username}${teamText} won ${item.solAmount.toFixed(2)} SOL`,
        type: "win" as const,
      };
    });

    // If no feed items yet, show a placeholder message
    return tickerItems.length > 0
      ? tickerItems
      : [
          {
            id: "placeholder",
            text: "Welcome to Solana PvP Arena - Live matches will appear here",
            type: "info" as const,
          },
        ];
  }, [feed]);

  const itemsRef = useRef(displayTickerItems);

  // Update itemsRef when feed changes
  useEffect(() => {
    itemsRef.current = displayTickerItems;
  }, [displayTickerItems]);

  // Use Framer Motion for smooth animation - no pause on hover to prevent blinking
  useEffect(() => {
    if (containerRef.current && feed.length > 0) {
      const containerWidth = containerRef.current.scrollWidth / 3; // One third of total (3 copies)
      const duration = containerWidth / 50; // 50px per second = smooth readable speed
      
      controls.start({
        x: [0, -containerWidth],
        transition: {
          duration: duration,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        },
      });
    }
  }, [controls, feed]);

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
    >
      <div className="overflow-hidden py-1">
        <motion.div
          ref={containerRef}
          animate={controls}
          className="flex whitespace-nowrap"
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
        </motion.div>
      </div>
    </div>
  );
};
