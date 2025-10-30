import { useEffect, useRef } from "react";
import { useArenaStore } from "../store/arenaStore";
import { signalRService } from "../services/websocket/signalr";
import type { FeedItem, MatchLobby } from "../store/arenaStore";

export const useArenaRealtime = () => {
  const { setFeed, addFeedItem, upsertMatches, updateMatch, setJoinModal } =
    useArenaStore();

  const isSubscribed = useRef(false);

  useEffect(() => {
    if (isSubscribed.current) return;

    // Subscribe to feed events
    signalRService.on("feed:latest", (feed: FeedItem[]) => {
      console.log("Received latest feed:", feed);
      setFeed(feed);
    });

    signalRService.on("feed:append", (item: FeedItem) => {
      console.log("Received new feed item:", item);
      addFeedItem(item);
    });

    // Subscribe to matches events
    signalRService.on("matches:latest", (matches: MatchLobby[]) => {
      console.log("Received latest matches:", matches);
      upsertMatches(matches);
    });

    signalRService.on("matches:update", (match: MatchLobby) => {
      console.log("Received match update:", match);
      updateMatch(match);
    });

    signalRService.on(
      "match:joined",
      (data: { matchId: string; player: string }) => {
        console.log("Player joined match:", data);
        // Update match players count
        const { matchId, player } = data;
        // This would typically update the match in the store
        // For now, we'll just log it
      }
    );

    signalRService.on(
      "match:left",
      (data: { matchId: string; player: string }) => {
        console.log("Player left match:", data);
        // Update match players count
        const { matchId, player } = data;
        // This would typically update the match in the store
        // For now, we'll just log it
      }
    );

    // Join arena and get initial data
    const initializeArena = async () => {
      try {
        await signalRService.joinArena();
        await signalRService.getLatestFeed();
        await signalRService.getLatestMatches();
      } catch (error) {
        console.error("Failed to initialize arena:", error);
      }
    };

    initializeArena();
    isSubscribed.current = true;

    // Cleanup on unmount
    return () => {
      signalRService.leaveArena();
      isSubscribed.current = false;
    };
  }, [setFeed, addFeedItem, upsertMatches, updateMatch, setJoinModal]);

  // Helper functions for match actions
  const joinMatch = async (matchId: string) => {
    try {
      await signalRService.joinMatch(matchId);
      setJoinModal(matchId);
    } catch (error) {
      console.error("Failed to join match:", error);
    }
  };

  const leaveMatch = async (matchId: string) => {
    try {
      await signalRService.leaveMatch(matchId);
    } catch (error) {
      console.error("Failed to leave match:", error);
    }
  };

  return {
    joinMatch,
    leaveMatch,
  };
};
