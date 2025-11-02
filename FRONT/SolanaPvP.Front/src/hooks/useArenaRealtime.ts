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

      // Calculate playersMax from matchType
      const playersMax =
        match.matchType === "Team" ? 10 : match.matchType === "Duo" ? 4 : 2;

      // Convert backend MatchView to arenaStore MatchLobby format
      const lobbyMatch: MatchLobby = {
        id: match.matchPda,
        matchPda: match.matchPda,
        stake: match.stakeLamports / 1000000000, // Convert lamports to SOL
        playersReady: match.participants?.length || 0,
        playersMax,
        endsAt: match.deadlineTs * 1000, // Convert unix timestamp to ms
        gameMode: match.gameMode || "Pick3from9",
        matchType: match.matchType || "Solo",
        status: match.status,
      };
      addMatch(lobbyMatch);
    });

    signalRService.on("matchJoined", (match: any) => {
      console.log("Match joined:", match);

      // Calculate playersMax from matchType
      const playersMax =
        match.matchType === "Team" ? 10 : match.matchType === "Duo" ? 4 : 2;

      const lobbyMatch: MatchLobby = {
        id: match.matchPda,
        matchPda: match.matchPda,
        stake: match.stakeLamports / 1000000000,
        playersReady: match.participants?.length || 0,
        playersMax,
        endsAt: match.deadlineTs * 1000,
        gameMode: match.gameMode || "Pick3from9",
        matchType: match.matchType || "Solo",
        status: match.status,
      };
      updateMatch(lobbyMatch);
    });

    signalRService.on("matchResolved", (match: any) => {
      console.log("Match resolved:", match);

      // Calculate playersMax from matchType
      const playersMax =
        match.matchType === "Team" ? 10 : match.matchType === "Duo" ? 4 : 2;

      // Update match to show as ended (orange) for 5 seconds before removing
      const lobbyMatch: MatchLobby = {
        id: match.matchPda,
        matchPda: match.matchPda,
        stake: match.stakeLamports / 1000000000,
        playersReady: match.participants?.length || 0,
        playersMax,
        endsAt: match.deadlineTs * 1000,
        gameMode: match.gameMode || "Pick3from9",
        matchType: match.matchType || "Solo",
        status: "Resolved",
        resolvedAt: Date.now(),
      };
      updateMatch(lobbyMatch);

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

      // Remove from active matches after 5 seconds
      setTimeout(() => {
        removeMatch(match.matchPda);
      }, 5000);
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

        // Load initial active matches from API
        const activeMatchesResult = await matchesApi.getActiveMatches(1, 20);
        const lobbyMatches: MatchLobby[] = activeMatchesResult.items.map(
          (match: any) => {
            // Calculate playersMax from matchType
            const playersMax =
              match.matchType === "Team"
                ? 10
                : match.matchType === "Duo"
                ? 4
                : 2;

            return {
              id: match.matchPda,
              matchPda: match.matchPda,
              stake: match.stakeLamports / 1000000000,
              playersReady: match.participants?.length || 0,
              playersMax,
              endsAt: match.deadlineTs * 1000,
              gameMode: match.gameMode || "Pick3from9",
              matchType: match.matchType || "Solo",
              status: match.status,
            };
          }
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
      // No need to call leaveArena - backend doesn't have this method
      // SignalR will automatically disconnect when component unmounts
      isSubscribed.current = false;
    };
  }, [addFeedItemToTop, addMatch, updateMatch, removeMatch, setLoading]);

  return {};
};
