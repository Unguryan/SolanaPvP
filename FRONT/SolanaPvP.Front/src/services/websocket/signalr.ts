// SignalR WebSocket service
import * as signalR from "@microsoft/signalr";
import { API_CONFIG, WEBSOCKET } from "@/constants/config";

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;

  // Event handlers
  private eventHandlers: Map<string, Array<(data: unknown) => void>> =
    new Map();

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_CONFIG.WS_URL}/ws`)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    this.setupEventHandlers();
    this.setupConnectionHandlers();
  }

  private setupEventHandlers() {
    if (!this.connection) return;

    // Match events
    this.connection.on("matchCreated", (match) => {
      this.emit("matchCreated", match);
    });

    this.connection.on("matchJoined", (match) => {
      this.emit("matchJoined", match);
    });

    this.connection.on("matchResolved", (match) => {
      this.emit("matchResolved", match);
    });

    this.connection.on("matchRefunded", (match) => {
      this.emit("matchRefunded", match);
    });

    // Arena events - Live Feed
    this.connection.on("feed:latest", (feedItems) => {
      this.emit("feed:latest", feedItems);
    });

    this.connection.on("feed:append", (feedItem) => {
      this.emit("feed:append", feedItem);
    });

    // Arena events - Matches
    this.connection.on("matches:latest", (matches) => {
      this.emit("matches:latest", matches);
    });

    this.connection.on("matches:update", (match) => {
      this.emit("matches:update", match);
    });

    this.connection.on("match:joined", (match) => {
      this.emit("match:joined", match);
    });

    this.connection.on("match:left", (matchId) => {
      this.emit("match:left", matchId);
    });

    // Invitation events
    this.connection.on("invitationReceived", (invitation) => {
      this.emit("invitationReceived", invitation);
    });

    this.connection.on("invitationAccepted", (invitation) => {
      this.emit("invitationAccepted", invitation);
    });

    this.connection.on("invitationDeclined", (invitation) => {
      this.emit("invitationDeclined", invitation);
    });

    this.connection.on("invitationCancelled", (invitation) => {
      this.emit("invitationCancelled", invitation);
    });
  }

  private setupConnectionHandlers() {
    if (!this.connection) return;

    this.connection.onclose((error) => {
      console.log("SignalR connection closed:", error);
      this.emit("connectionClosed", error);
      this.scheduleReconnect();
    });

    this.connection.onreconnecting((error) => {
      console.log("SignalR reconnecting:", error);
      this.emit("reconnecting", error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log("SignalR reconnected:", connectionId);
      this.reconnectAttempts = 0;
      this.emit("reconnected", connectionId);
      this.startPing();
    });
  }

  async connect(): Promise<void> {
    if (!this.connection) {
      this.initializeConnection();
    }

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection?.start();
      console.log("SignalR connected");
      this.emit("connected");
      this.startPing();
    } catch (error) {
      console.error("SignalR connection failed:", error);
      this.emit("connectionFailed", error);
      this.scheduleReconnect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.stopPing();
      await this.connection.stop();
      this.connection = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= WEBSOCKET.MAX_RECONNECT_ATTEMPTS) {
      console.log("Max reconnection attempts reached");
      this.emit("maxReconnectAttemptsReached");
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay =
      WEBSOCKET.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = window.setInterval(() => {
      if (this.connection?.state === signalR.HubConnectionState.Connected) {
        this.connection.invoke("Ping");
      }
    }, WEBSOCKET.PING_INTERVAL);
  }

  private stopPing() {
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Hub methods
  async joinLobby(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("JoinLobby");
    }
  }

  async leaveLobby(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("LeaveLobby");
    }
  }

  async joinMatchGroup(matchPda: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("JoinMatchGroup", matchPda);
    }
  }

  async leaveMatchGroup(matchPda: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("LeaveMatchGroup", matchPda);
    }
  }

  // Arena methods
  async joinArena(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("JoinArena");
    }
  }

  async leaveArena(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("LeaveArena");
    }
  }

  async getLatestFeed(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("GetLatestFeed");
    }
  }

  async getLatestMatches(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("GetLatestMatches");
    }
  }

  async joinMatch(matchId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("JoinMatch", matchId);
    }
  }

  async leaveMatch(matchId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("LeaveMatch", matchId);
    }
  }

  // Event subscription
  on<T = unknown>(event: string, handler: (data: T) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers
      .get(event)!
      .push(handler as unknown as (data: unknown) => void);
  }

  off<T = unknown>(event: string, handler: (data: T) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(
        handler as unknown as (data: unknown) => void
      );
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  // Connection state
  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  get connectionState(): signalR.HubConnectionState | undefined {
    return this.connection?.state;
  }
}

export const signalRService = new SignalRService();
