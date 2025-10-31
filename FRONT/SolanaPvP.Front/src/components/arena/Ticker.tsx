import React, { useState, useRef, useEffect } from "react";

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
  speed = 230,
  pauseOnHover = true,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(defaultTickerItems);

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
