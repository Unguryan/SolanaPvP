// Live Arena Home page component
import React from "react";
import { useArenaStore } from "@/store/arenaStore";
import { useArenaRealtime } from "@/hooks/useArenaRealtime";
import { HeroCTA } from "@/components/arena/HeroCTA";
import { LiveFeed } from "@/components/arena/LiveFeed";
import { MatchesList } from "@/components/arena/MatchesList";
import { JoinMatchSheet } from "@/components/arena/JoinMatchSheet";

export const Home: React.FC = () => {
  const { joinModalMatchId, setJoinModal } = useArenaStore();

  // Initialize real-time arena data
  useArenaRealtime();

  const handleCloseJoinModal = () => {
    setJoinModal(null);
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Main Content */}
      <main className="relative">
        {/* Desktop Layout (≥1024px) */}
        <div className="hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-3 gap-8 min-h-[calc(100vh-8rem)]">
              {/* Left Column - Live Feed */}
              <div className="space-y-6">
                <LiveFeed className="h-fit" />
              </div>

              {/* Center Column - Hero CTA */}
              <div className="flex items-center justify-center">
                <HeroCTA />
              </div>

              {/* Right Column - Live Matches */}
              <div id="matches-section" className="space-y-6">
                <MatchesList className="h-fit" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Layout (<1024px) */}
        <div className="lg:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Hero CTA */}
            <div className="text-center">
              <HeroCTA />
            </div>

            {/* Live Matches */}
            <div id="matches-section">
              <MatchesList />
            </div>

            {/* Live Feed */}
            <div>
              <LiveFeed />
            </div>
          </div>
        </div>
      </main>

      {/* Join Match Modal */}
      <JoinMatchSheet
        isOpen={!!joinModalMatchId}
        onClose={handleCloseJoinModal}
      />
    </div>
  );
};
