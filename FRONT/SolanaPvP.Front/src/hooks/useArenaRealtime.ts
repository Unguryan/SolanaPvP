import { useEffect, useRef } from "react";
import { useArenaStore } from "../store/arenaStore";
import { signalRService } from "../services/websocket/signalr";
import type { FeedItem, MatchLobby } from "../store/arenaStore";
import { matchesApi } from "../services/api/matches";
import { getPlayersMaxFromTeamSize } from "../utils/gameModeMapper";

export const useArenaRealtime = () => {
  const { addFeedItemToTop, addMatch, updateMatch, removeMatch, setLoading, setFeed } =
    useArenaStore();

  const isSubscribed = useRef(false);

  useEffect(() => {
    if (isSubscribed.current) return;

    // Subscribe to match events from backend (IndexerWorker broadcasts)
    signalRService.on("matchCreated", (match: any) => {
      console.log("📢 [Arena] Match created:", match);

      // Skip if already resolved/refunded
      if (match.status === "Resolved" || match.status === "Refunded") {
        console.log("📢 [Arena] Match already ended, skipping");
        return;
      }

      // Calculate playersMax from teamSize
      const playersMax = getPlayersMaxFromTeamSize(match.teamSize || "OneVOne");

      // Convert backend MatchView to arenaStore MatchLobby format
      const lobbyMatch: MatchLobby = {
        id: match.matchPda,
        matchPda: match.matchPda,
        creator: match.creatorPubkey || match.creator || "",
        stake: match.stakeLamports / 1000000000, // Convert lamports to SOL
        playersReady: match.participants?.length || 0,
        playersMax,
        endsAt: match.deadlineTs * 1000, // Convert unix timestamp to ms
        gameType: match.gameType,
        gameMode: match.gameMode,
        matchMode: match.matchMode,
        teamSize: match.teamSize,
        status: match.status,
      };
      addMatch(lobbyMatch);
    });

    signalRService.on("matchJoined", (match: any) => {
      console.log("Match joined:", match);

      // Calculate playersMax from teamSize
      const playersMax = getPlayersMaxFromTeamSize(match.teamSize || "OneVOne");

      const lobbyMatch: MatchLobby = {
        id: match.matchPda,
        matchPda: match.matchPda,
        creator: match.creatorPubkey || match.creator || "",
        stake: match.stakeLamports / 1000000000,
        playersReady: match.participants?.length || 0,
        playersMax,
        endsAt: match.deadlineTs * 1000,
        gameType: match.gameType,
        gameMode: match.gameMode,
        matchMode: match.matchMode,
        teamSize: match.teamSize,
        status: match.status,
      };
      updateMatch(lobbyMatch);
    });

    signalRService.on("matchResolved", (match: any) => {
      console.log("📢 [Arena] Match resolved:", match);

      // Remove from active matches IMMEDIATELY (no 5 second delay)
      // Feed updates are now handled by feed:append event from GameTimeoutWorker
      removeMatch(match.matchPda);
      console.log("📢 [Arena] Removed resolved match from active list");
    });

    signalRService.on("matchRefunded", (match: any) => {
      console.log("Match refunded:", match);
      // Remove from active matches
      removeMatch(match.matchPda);
    });

    // Subscribe to feed:append event for real-time feed updates
    signalRService.on("feed:append", (feedData: any) => {
      console.log("📢 [Arena] Feed item received:", feedData);
      
      // Extract winner participant
      const winner = feedData.participants?.find((p: any) => p.isWinner);
      if (!winner) {
        console.warn("No winner found in feed data");
        return;
      }
      
      const feedItem: FeedItem = {
        id: feedData.matchPda,
        matchPda: feedData.matchPda,
        username: winner.username && winner.username.trim() !== "" 
          ? winner.username 
          : winner.pubkey.substring(0, 8) + "...",
        solAmount: feedData.stakeLamports / 1e9, // Convert lamports to SOL
        gameType: feedData.gameType,
        gameMode: feedData.gameMode,
        matchType: feedData.teamSize || "OneVOne", // Use teamSize
        winnerSide: feedData.winnerSide,
        timestamp: new Date(feedData.resolvedAt).getTime(),
      };
      
      addFeedItemToTop(feedItem);
    });

    // Initialize: Load active matches and recent feed from API
    const initializeArena = async () => {
      try {
        setLoading(true);
        await signalRService.connect();

        // Load initial active matches from API
        const activeMatchesResult = await matchesApi.getActiveMatches(1, 20);
        const lobbyMatches: MatchLobby[] = activeMatchesResult.items.map(
          (match: any) => {
            // Calculate playersMax from teamSize
            const playersMax = getPlayersMaxFromTeamSize(match.teamSize || "OneVOne");

            return {
              id: match.matchPda,
              matchPda: match.matchPda,
              creator: match.creatorPubkey || match.creator || "",
              stake: match.stakeLamports / 1000000000,
              playersReady: match.participants?.length || 0,
              playersMax,
              endsAt: match.deadlineTs * 1000,
              gameType: match.gameType,
              gameMode: match.gameMode,
              matchMode: match.matchMode,
              teamSize: match.teamSize,
              status: match.status,
            };
          }
        );

        // Set initial matches
        lobbyMatches.forEach(addMatch);

        // Load initial feed data
        try {
          const recentMatches = await matchesApi.getRecentMatches(10);
          
          const feedItems: FeedItem[] = recentMatches
            .filter((m: any) => m.participants && m.participants.length > 0)
            .map((match: any) => {
              const winner = match.participants.find((p: any) => p.isWinner);
              if (!winner) return null;
              
              return {
                id: match.matchPda,
                matchPda: match.matchPda,
                username: winner.username && winner.username.trim() !== "" 
                  ? winner.username 
                  : winner.pubkey.substring(0, 8) + "...",
                solAmount: match.stakeLamports / 1e9,
                gameType: match.gameType,
                gameMode: match.gameMode,
                matchType: match.teamSize || "OneVOne", // Use teamSize
                winnerSide: match.winnerSide ?? 0,
                timestamp: new Date(match.resolvedAt).getTime(),
              } as FeedItem;
            })
            .filter((item: FeedItem | null): item is FeedItem => item !== null);
          
          setFeed(feedItems);
          console.log("📢 [Arena] Loaded initial feed:", feedItems.length, "items");
        } catch (error) {
          console.error("Failed to load initial feed:", error);
        }
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
  }, [addFeedItemToTop, addMatch, updateMatch, removeMatch, setLoading, setFeed]);

  return {};
};
