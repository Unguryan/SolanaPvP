import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

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

const defaultTickerItems: TickerItem[] = [
  { id: "1", text: "🎉 gm001 won 3.6 SOL in Pick3from9", type: "win" },
  { id: "2", text: "⚡ solplayer joined a 5.2 SOL match", type: "join" },
  { id: "3", text: "🏆 crypto_king won 2.1 SOL in Pick1from3", type: "win" },
  {
    id: "4",
    text: "🔥 blockchain_boss won 7.8 SOL in Pick3from9",
    type: "win",
  },
  { id: "5", text: "💎 defi_master joined a 4.3 SOL match", type: "join" },
  { id: "6", text: "🚀 nft_hunter won 1.9 SOL in Pick1from3", type: "win" },
  { id: "7", text: "⚔️ web3_warrior won 6.7 SOL in Pick3from9", type: "win" },
  { id: "8", text: "🎯 solana_sniper joined a 3.2 SOL match", type: "join" },
  {
    id: "9",
    text: "💫 metaverse_mogul won 8.1 SOL in Pick1from3",
    type: "win",
  },
  { id: "10", text: "🌟 dao_destroyer won 2.8 SOL in Pick3from9", type: "win" },
  { id: "11", text: "🌾 yield_farmer joined a 5.5 SOL match", type: "join" },
  {
    id: "12",
    text: "💧 liquidity_lord won 4.7 SOL in Pick5from16",
    type: "win",
  },
];

export const Ticker: React.FC<TickerProps> = ({
  className = "",
  speed = 30,
  pauseOnHover = true,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [items, setItems] = useState<TickerItem[]>(defaultTickerItems);
  const containerRef = useRef<HTMLDivElement>(null);

  // Duplicate items for seamless loop - need 3 copies for smooth animation
  const duplicatedItems = [...items, ...items, ...items];

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

  // Add new items periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newItem: TickerItem = {
        id: `new-${Date.now()}`,
        text: `🎲 Player${Math.floor(Math.random() * 1000)} won ${(
          Math.random() * 10 +
          0.5
        ).toFixed(1)} SOL`,
        type: "win",
      };

      setItems((prev) => [...prev.slice(-10), newItem]); // Keep only last 10 items
    }, 15000); // Add new item every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`w-full z-40 bg-bg/80 backdrop-blur-sm border-t border-b border-white/10 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="overflow-hidden py-1">
        <motion.div
          ref={containerRef}
          className="flex whitespace-nowrap"
          animate={{
            x: isPaused ? 0 : "-33.333%",
          }}
          transition={{
            duration: speed * 0.67, // Faster: 30s -> 20s
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
        >
          {duplicatedItems.map((item, index) => (
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
