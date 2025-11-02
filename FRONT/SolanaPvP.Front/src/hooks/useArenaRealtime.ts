import { useEffect, useRef } from "react";
import { useArenaStore } from "../store/arenaStore";
import { signalRService } from "../services/websocket/signalr";
import type { FeedItem, MatchLobby } from "../store/arenaStore";
import { matchesApi } from "../services/api/matches";

export const useArenaRealtime = () => {
  const { addFeedItemToTop, addMatch, updateMatch, removeMatch, setLoading } =
    useArenaStore();

  const isSubscribed = useRef(false);

  useEffect(() => {
    if (isSubscribed.current) return;

    // Subscribe to match events from backend (IndexerWorker broadcasts)
    signalRService.on("matchCreated", (match: any) => {
      console.log("Match created:", match);
      // Convert backend MatchView to arenaStore MatchLobby format
      const lobbyMatch: MatchLobby = {
        id: match.matchPda,
        matchPda: match.matchPda,
        stake: match.stakeLamports / 1000000000, // Convert lamports to SOL
        playersReady: match.participants?.length || 0,
        playersMax: 2, // For 1v1, TODO: calculate from match type
        endsAt: match.deadlineTs * 1000, // Convert unix timestamp to ms
        gameMode: match.gameMode || "Pick3from9",
        matchType: match.matchType || "Solo",
      };
      addMatch(lobbyMatch);
    });

    signalRService.on("matchJoined", (match: any) => {
      console.log("Match joined:", match);
      const lobbyMatch: MatchLobby = {
        id: match.matchPda,
        matchPda: match.matchPda,
        stake: match.stakeLamports / 1000000000,
        playersReady: match.participants?.length || 0,
        playersMax: 2,
        endsAt: match.deadlineTs * 1000,
        gameMode: match.gameMode || "Pick3from9",
        matchType: match.matchType || "Solo",
      };
      updateMatch(lobbyMatch);
    });

    signalRService.on("matchResolved", (match: any) => {
      console.log("Match resolved:", match);
      // Remove from active matches
      removeMatch(match.matchPda);

      // Add to feed as win notification
      if (match.participants && match.winnerSide !== null) {
        const winners = match.participants.filter(
          (p: any) => p.side === match.winnerSide
        );
        winners.forEach((winner: any) => {
          const feedItem: FeedItem = {
            id: `${match.matchPda}_${winner.pubkey}`,
            username: winner.pubkey.substring(0, 8) + "...",
            solAmount: match.stakeLamports / 1000000000,
            timestamp: Date.now(),
            gameMode: match.gameMode || "Pick3from9",
          };
          addFeedItemToTop(feedItem);
        });
      }
    });

    signalRService.on("matchRefunded", (match: any) => {
      console.log("Match refunded:", match);
      // Remove from active matches
      removeMatch(match.matchPda);
    });

    // Initialize: Load active matches from API
    const initializeArena = async () => {
      try {
        setLoading(true);
        await signalRService.connect();
        await signalRService.joinArena();

        // Load initial active matches from API
        const activeMatchesResult = await matchesApi.getActiveMatches(1, 20);
        const lobbyMatches: MatchLobby[] = activeMatchesResult.items.map(
          (match: any) => ({
            id: match.matchPda,
            matchPda: match.matchPda,
            stake: match.stakeLamports / 1000000000,
            playersReady: match.participants?.length || 0,
            playersMax: 2,
            endsAt: match.deadlineTs * 1000,
            gameMode: match.gameMode || "Pick3from9",
            matchType: match.matchType || "Solo",
          })
        );

        // Set initial matches
        lobbyMatches.forEach(addMatch);
      } catch (error) {
        console.error("Failed to initialize arena:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeArena();
    isSubscribed.current = true;

    // Cleanup on unmount
    return () => {
      signalRService.leaveArena();
      isSubscribed.current = false;
    };
  }, [addFeedItemToTop, addMatch, updateMatch, removeMatch, setLoading]);

  return {};
};
