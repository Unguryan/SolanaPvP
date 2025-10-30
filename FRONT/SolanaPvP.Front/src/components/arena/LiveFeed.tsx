import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useArenaStore } from "@/store/arenaStore";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { formatDistanceToNow } from "date-fns";

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

  const displayItems = showAll ? feed : feed.slice(0, maxItems);
  const hasMore = feed.length > maxItems;

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
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
    <GlassCard className={`p-4 ${className}`}>
      <GlassCardHeader>
        <GlassCardTitle className="text-lg font-display text-sol-purple flex items-center">
          <span className="w-2 h-2 bg-sol-mint rounded-full mr-2 animate-pulse" />
          Live Feed
        </GlassCardTitle>
      </GlassCardHeader>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {displayItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="feed-item"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-lg">
                    {getGameModeIcon(item.gameMode)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-txt-base font-medium">
                        {item.username}
                      </span>
                      <span className="text-sol-mint font-semibold">
                        +{item.solAmount} SOL
                      </span>
                    </div>
                    <div className="text-xs text-txt-muted">
                      {item.gameMode} • {formatTime(item.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-sol-mint text-sm font-medium">WIN</div>
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
