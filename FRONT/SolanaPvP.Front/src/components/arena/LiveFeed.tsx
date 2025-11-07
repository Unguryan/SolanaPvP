import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useArenaStore } from "@/store/arenaStore";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { formatGameDisplay } from "@/utils/gameModeMapper";
import { formatTimeAgo } from "@/utils/dateFormat";

interface LiveFeedProps {
  className?: string;
  maxItems?: number;
  showMore?: boolean;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({
  className = "",
  maxItems = 10,
  showMore = true,
}) => {
  const { feed, isLoading } = useArenaStore();
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const displayItems = showAll ? feed : feed.slice(0, maxItems);
  const hasMore = feed.length > maxItems;

  const formatTime = (timestamp: number) => {
    // Timestamp is in milliseconds, convert to UTC ISO string
    const date = new Date(timestamp);
    return formatTimeAgo(date.toISOString());
  };

  const getGameModeIcon = (gameMode: string) => {
    switch (gameMode) {
      case "Pick3from9":
        return "🎴";
      case "Pick5from16":
        return "🏆";
      case "Pick1from3":
        return "🎯";
      default:
        return "🎮";
    }
  };

  if (isLoading) {
    return (
      <GlassCard className={`p-4 ${className}`}>
        <GlassCardHeader>
          <GlassCardTitle className="text-lg font-display text-sol-purple">
            Live Feed
          </GlassCardTitle>
        </GlassCardHeader>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-3 lg:p-4 ${className}`}>
      <GlassCardHeader>
        <GlassCardTitle className="text-lg font-display text-sol-purple flex items-center">
          <span className="w-2 h-2 bg-sol-mint rounded-full mr-2 animate-pulse" />
          Live Feed
        </GlassCardTitle>
      </GlassCardHeader>

      <div className="space-y-1.5 lg:space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {displayItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => navigate(`/match/${item.matchPda}`)}
              className="feed-item cursor-pointer hover:bg-white/5 p-2 lg:p-3 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between gap-2 lg:gap-3">
                <div className="flex items-center space-x-2 lg:space-x-3 flex-1 min-w-0">
                  <div className="text-base lg:text-lg flex-shrink-0">
                    {getGameModeIcon(item.gameMode)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5 lg:space-x-2 flex-wrap">
                      <span className="text-txt-base font-medium text-sm lg:text-base truncate">
                        {item.username}
                      </span>
                      <span className="text-sol-mint font-semibold text-sm lg:text-base flex-shrink-0">
                        +{item.solAmount.toFixed(3)} SOL
                      </span>
                    </div>
                    <div className="text-xs text-txt-muted">
                      {formatGameDisplay(item.gameType || "PickHigher", item.gameMode, item.matchType)} • {formatTime(item.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-sol-mint text-xs lg:text-sm font-medium flex-shrink-0">VIEW →</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {feed.length === 0 && (
          <div className="text-center py-8">
            <div className="text-txt-muted text-sm">No recent activity</div>
          </div>
        )}
      </div>

      {showMore && hasMore && (
        <div className="mt-4 text-center">
          <GlowButton
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-sol-purple hover:text-sol-mint"
          >
            {showAll
              ? "Show Less"
              : `Show More (${feed.length - maxItems} more)`}
          </GlowButton>
        </div>
      )}
    </GlassCard>
  );
};
