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
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-8 space-y-4 lg:space-y-8">
            {/* Hero CTA at top */}
            <div className="flex justify-center">
              <HeroCTA />
            </div>

            {/* Live Feed and Matches in two columns below */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Live Feed */}
              <div className="space-y-6">
                <LiveFeed className="h-fit" />
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
          <div className="max-w-7xl mx-auto px-3 py-4 space-y-3">
            {/* Hero CTA */}
            <div className="text-center">
              <HeroCTA />
            </div>

            {/* Live Feed - первый ряд */}
            <div>
              <LiveFeed />
            </div>

            {/* Live Matches - второй ряд */}
            <div id="matches-section">
              <MatchesList />
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
