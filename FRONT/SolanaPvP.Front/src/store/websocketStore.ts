// WebSocket store for SignalR connection state
import { create } from "zustand";
import { signalRService } from "@/services/websocket/signalr";
import { MatchView } from "@/types/match";
import { MatchInvitation } from "@/types/invitation";

interface WebSocketState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setReconnectAttempts: (attempts: number) => void;

  // Hub methods
  joinLobby: () => Promise<void>;
  leaveLobby: () => Promise<void>;
  joinMatchGroup: (matchPda: string) => Promise<void>;
  leaveMatchGroup: (matchPda: string) => Promise<void>;

  // Event handlers
  onMatchCreated: (callback: (match: MatchView) => void) => void;
  onMatchJoined: (callback: (match: MatchView) => void) => void;
  onMatchInProgress: (callback: (match: any) => void) => void;
  onMatchFinalized: (callback: (match: any) => void) => void;
  onMatchRefunded: (callback: (match: MatchView) => void) => void;
  onInvitationReceived: (
    callback: (invitation: MatchInvitation) => void
  ) => void;
  onInvitationAccepted: (
    callback: (invitation: MatchInvitation) => void
  ) => void;
  onInvitationDeclined: (
    callback: (invitation: MatchInvitation) => void
  ) => void;
  onInvitationCancelled: (
    callback: (invitation: MatchInvitation) => void
  ) => void;

  // Cleanup
  removeAllListeners: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  reconnectAttempts: 0,

  // Actions
  connect: async () => {
    set({ isConnecting: true, connectionError: null });

    try {
      await signalRService.connect();
      set({
        isConnected: true,
        isConnecting: false,
        connectionError: null,
        reconnectAttempts: 0,
      });
    } catch (error: any) {
      console.error("WebSocket connection failed:", error);
      set({
        isConnected: false,
        isConnecting: false,
        connectionError: error.message || "Connection failed",
      });
    }
  },

  disconnect: async () => {
    set({ isConnecting: true });

    try {
      await signalRService.disconnect();
      set({
        isConnected: false,
        isConnecting: false,
        connectionError: null,
      });
    } catch (error: any) {
      console.error("WebSocket disconnection failed:", error);
      set({
        isConnecting: false,
        connectionError: error.message || "Disconnection failed",
      });
    }
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },

  setConnecting: (connecting) => {
    set({ isConnecting: connecting });
  },

  setConnectionError: (error) => {
    set({ connectionError: error });
  },

  setReconnectAttempts: (attempts) => {
    set({ reconnectAttempts: attempts });
  },

  // Hub methods
  joinLobby: async () => {
    try {
      await signalRService.joinLobby();
    } catch (error) {
      console.error("Failed to join lobby:", error);
    }
  },

  leaveLobby: async () => {
    try {
      await signalRService.leaveLobby();
    } catch (error) {
      console.error("Failed to leave lobby:", error);
    }
  },

  joinMatchGroup: async (matchPda) => {
    try {
      await signalRService.joinMatchGroup(matchPda);
    } catch (error) {
      console.error("Failed to join match group:", error);
    }
  },

  leaveMatchGroup: async (matchPda) => {
    try {
      await signalRService.leaveMatchGroup(matchPda);
    } catch (error) {
      console.error("Failed to leave match group:", error);
    }
  },

  // Event handlers
  onMatchCreated: (callback) => {
    signalRService.on("matchCreated", callback);
  },

  onMatchJoined: (callback) => {
    signalRService.on("matchJoined", callback);
  },

  onMatchInProgress: (callback) => {
    signalRService.on("matchInProgress", callback);
  },

  onMatchFinalized: (callback) => {
    signalRService.on("matchFinalized", callback);
  },

  onMatchRefunded: (callback) => {
    signalRService.on("matchRefunded", callback);
  },

  onInvitationReceived: (callback) => {
    signalRService.on("invitationReceived", callback);
  },

  onInvitationAccepted: (callback) => {
    signalRService.on("invitationAccepted", callback);
  },

  onInvitationDeclined: (callback) => {
    signalRService.on("invitationDeclined", callback);
  },

  onInvitationCancelled: (callback) => {
    signalRService.on("invitationCancelled", callback);
  },

  // Cleanup
  removeAllListeners: () => {
    // Note: The SignalR service doesn't expose a way to remove all listeners
    // This would need to be implemented in the SignalR service if needed
    console.log("Remove all listeners called - not implemented");
  },
}));
