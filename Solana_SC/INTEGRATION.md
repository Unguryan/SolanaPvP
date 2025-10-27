# Frontend Integration Guide

This guide explains how to integrate the Solana PvP smart contract with your React frontend.

## 🎯 Overview

The frontend integration provides:

- **React Hooks**: Easy-to-use hooks for program interactions
- **Type Safety**: Full TypeScript support with generated types
- **Error Handling**: Comprehensive error parsing and user feedback
- **Event Listening**: Real-time updates for lobby state changes
- **Wallet Integration**: Seamless Solana wallet adapter integration

## 📦 Dependencies

The following packages have been added to your `package.json`:

```json
{
  "dependencies": {
    "@coral-xyz/anchor": "^0.30.1",
    "@switchboard-xyz/solana.js": "^0.1.0",
    "bn.js": "^5.2.0"
  }
}
```

## 🏗️ Architecture

```
src/
├── services/
│   └── solana/
│       ├── config.ts          # Network configuration
│       ├── accounts.ts        # Account types and utilities
│       ├── program.ts         # Program instance management
│       └── instructions.ts    # Instruction builders and fetchers
├── hooks/
│   └── usePvpProgram.ts       # React hooks for program interactions
└── components/
    └── game/
        └── GameDemo.tsx       # Updated with real program calls
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd FRONT/SolanaPvP.Front
npm install
```

### 2. Configure Network

Update `src/services/solana/config.ts` with your deployed program ID:

```typescript
export const DEVNET_CONFIG: SolanaConfig = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  wsUrl: "wss://api.devnet.solana.com",
  programId: "YOUR_ACTUAL_PROGRAM_ID_HERE", // Update this
  // ... other config
};
```

### 3. Use in Components

```typescript
import { usePvpProgram, useLobbyOperations } from "../hooks/usePvpProgram";

function GameComponent() {
  const { isInitialized, publicKey, requestAirdropSOL } = usePvpProgram();
  const { createLobby, joinLobby, isCreating, isJoining } =
    useLobbyOperations();

  const handleCreateLobby = async () => {
    try {
      const tx = await createLobby({
        lobbyId: 1,
        teamSize: 1,
        stakeLamports: 100_000_000, // 0.1 SOL
        side: 0, // team1
      });
      console.log("Lobby created:", tx);
    } catch (error) {
      console.error("Failed to create lobby:", error);
    }
  };

  if (!isInitialized) {
    return <div>Connecting to program...</div>;
  }

  return (
    <div>
      <button onClick={handleCreateLobby} disabled={isCreating}>
        {isCreating ? "Creating..." : "Create Lobby"}
      </button>
    </div>
  );
}
```

## 🎣 Available Hooks

### usePvpProgram()

Main hook for program state management.

```typescript
const {
  program, // Anchor program instance
  connection, // Solana connection
  isInitialized, // Whether program is ready
  isLoading, // Loading state
  error, // Error message
  publicKey, // Connected wallet public key
  connected, // Wallet connection status
  requestAirdropSOL, // Request devnet SOL
  resetProgram, // Reset program state
} = usePvpProgram();
```

### useLobbyOperations()

Hook for lobby-related operations.

```typescript
const {
  createLobby, // Create new lobby
  joinLobby, // Join existing lobby
  refundLobby, // Refund lobby
  isCreating, // Creating lobby state
  isJoining, // Joining lobby state
  isRefunding, // Refunding lobby state
  isLoading, // Overall loading state
  error, // Error message
} = useLobbyOperations();
```

### useLobbyData(lobbyPda)

Hook for fetching single lobby data.

```typescript
const {
  lobby, // Lobby account data
  isLoading, // Loading state
  error, // Error message
  refetch, // Refetch function
} = useLobbyData(lobbyPda);
```

### useLobbiesData(lobbyPdas)

Hook for fetching multiple lobbies.

```typescript
const {
  lobbies, // Array of lobby data
  isLoading, // Loading state
  error, // Error message
  refetch, // Refetch function
} = useLobbiesData(lobbyPdas);
```

### useGlobalConfig()

Hook for fetching global configuration.

```typescript
const {
  config, // Global config data
  isLoading, // Loading state
  error, // Error message
  refetch, // Refetch function
} = useGlobalConfig();
```

### usePvpEvents()

Hook for listening to program events.

```typescript
const {
  addEventListener, // Add event listener
  removeEventListener, // Remove specific listener
  removeAllListeners, // Remove all listeners
  listeners, // Active listener IDs
} = usePvpEvents();

// Usage
useEffect(() => {
  const listenerId = addEventListener("LobbyCreated", (event) => {
    console.log("New lobby created:", event);
  });

  return () => removeEventListener(listenerId);
}, [addEventListener]);
```

### useWalletBalance()

Hook for wallet balance management.

```typescript
const {
  balance, // Balance in SOL
  isLoading, // Loading state
  error, // Error message
  refetch, // Refetch function
} = useWalletBalance();
```

## 🔧 Configuration

### Network Configuration

Update `src/services/solana/config.ts`:

```typescript
export const DEVNET_CONFIG: SolanaConfig = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  wsUrl: "wss://api.devnet.solana.com",
  programId: "YOUR_PROGRAM_ID",
  switchboardProgramId: "SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f",
  switchboardOracleQueue: "YOUR_ORACLE_QUEUE",
  switchboardPermissionAccount: "YOUR_PERMISSION_ACCOUNT",
};
```

### Environment Variables

Create `.env.local`:

```env
VITE_NETWORK=devnet
VITE_PROGRAM_ID=YOUR_PROGRAM_ID
VITE_RPC_URL=https://api.devnet.solana.com
VITE_WS_URL=wss://api.devnet.solana.com
```

## 📝 Example Components

### Lobby List Component

```typescript
import React, { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useLobbiesData, useLobbyOperations } from "../hooks/usePvpProgram";

interface LobbyListProps {
  lobbyPdas: PublicKey[];
}

export function LobbyList({ lobbyPdas }: LobbyListProps) {
  const { lobbies, isLoading, error } = useLobbiesData(lobbyPdas);
  const { joinLobby, isJoining } = useLobbyOperations();

  const handleJoinLobby = async (
    lobbyPda: PublicKey,
    creator: PublicKey,
    side: 0 | 1
  ) => {
    try {
      const tx = await joinLobby({
        lobbyPda,
        creator,
        side,
      });
      console.log("Joined lobby:", tx);
    } catch (error) {
      console.error("Failed to join lobby:", error);
    }
  };

  if (isLoading) return <div>Loading lobbies...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="lobby-list">
      {lobbies.map((lobby, index) => {
        if (!lobby) return null;

        return (
          <div key={index} className="lobby-item">
            <h3>Lobby #{lobby.lobbyId.toString()}</h3>
            <p>Team Size: {lobby.teamSize}</p>
            <p>Stake: {lobby.stakeLamports.toString()} lamports</p>
            <p>Status: {lobby.status}</p>
            <p>
              Team 1: {lobby.team1.length}/{lobby.teamSize}
            </p>
            <p>
              Team 2: {lobby.team2.length}/{lobby.teamSize}
            </p>

            {lobby.status === "Open" && (
              <div>
                <button
                  onClick={() =>
                    handleJoinLobby(lobbyPdas[index], lobby.creator, 0)
                  }
                  disabled={isJoining || lobby.team1.length >= lobby.teamSize}
                >
                  Join Team 1
                </button>
                <button
                  onClick={() =>
                    handleJoinLobby(lobbyPdas[index], lobby.creator, 1)
                  }
                  disabled={isJoining || lobby.team2.length >= lobby.teamSize}
                >
                  Join Team 2
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### Create Lobby Component

```typescript
import React, { useState } from "react";
import { useLobbyOperations } from "../hooks/usePvpProgram";

export function CreateLobbyForm() {
  const { createLobby, isCreating, error } = useLobbyOperations();
  const [formData, setFormData] = useState({
    lobbyId: 1,
    teamSize: 1 as 1 | 2 | 5,
    stakeLamports: 100_000_000,
    side: 0 as 0 | 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tx = await createLobby(formData);
      console.log("Lobby created:", tx);
      // Reset form or redirect
    } catch (error) {
      console.error("Failed to create lobby:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-lobby-form">
      <h2>Create New Lobby</h2>

      <div>
        <label>Lobby ID:</label>
        <input
          type="number"
          value={formData.lobbyId}
          onChange={(e) =>
            setFormData({ ...formData, lobbyId: parseInt(e.target.value) })
          }
          min="1"
        />
      </div>

      <div>
        <label>Team Size:</label>
        <select
          value={formData.teamSize}
          onChange={(e) =>
            setFormData({
              ...formData,
              teamSize: parseInt(e.target.value) as 1 | 2 | 5,
            })
          }
        >
          <option value={1}>1v1</option>
          <option value={2}>2v2</option>
          <option value={5}>5v5</option>
        </select>
      </div>

      <div>
        <label>Stake (SOL):</label>
        <input
          type="number"
          value={formData.stakeLamports / 1_000_000_000}
          onChange={(e) =>
            setFormData({
              ...formData,
              stakeLamports: parseFloat(e.target.value) * 1_000_000_000,
            })
          }
          min="0.05"
          step="0.01"
        />
      </div>

      <div>
        <label>Your Team:</label>
        <select
          value={formData.side}
          onChange={(e) =>
            setFormData({
              ...formData,
              side: parseInt(e.target.value) as 0 | 1,
            })
          }
        >
          <option value={0}>Team 1</option>
          <option value={1}>Team 2</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={isCreating}>
        {isCreating ? "Creating..." : "Create Lobby"}
      </button>
    </form>
  );
}
```

## 🔄 Event Handling

### Real-time Updates

```typescript
import { usePvpEvents } from "../hooks/usePvpProgram";

export function LobbyMonitor() {
  const { addEventListener, removeEventListener } = usePvpEvents();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const lobbyCreatedId = addEventListener("LobbyCreated", (event) => {
      setEvents((prev) => [
        ...prev,
        { type: "LobbyCreated", data: event, timestamp: Date.now() },
      ]);
    });

    const playerJoinedId = addEventListener("PlayerJoined", (event) => {
      setEvents((prev) => [
        ...prev,
        { type: "PlayerJoined", data: event, timestamp: Date.now() },
      ]);
    });

    const lobbyResolvedId = addEventListener("LobbyResolved", (event) => {
      setEvents((prev) => [
        ...prev,
        { type: "LobbyResolved", data: event, timestamp: Date.now() },
      ]);
    });

    return () => {
      removeEventListener(lobbyCreatedId);
      removeEventListener(playerJoinedId);
      removeEventListener(lobbyResolvedId);
    };
  }, [addEventListener, removeEventListener]);

  return (
    <div className="event-monitor">
      <h3>Live Events</h3>
      {events.map((event, index) => (
        <div key={index} className="event-item">
          <strong>{event.type}</strong>
          <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
          <pre>{JSON.stringify(event.data, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

## 🎨 Styling

### CSS Classes

The components use these CSS classes for styling:

```css
.lobby-list {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.lobby-item {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  background: #f9f9f9;
}

.create-lobby-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 1rem;
}

.create-lobby-form div {
  margin-bottom: 1rem;
}

.create-lobby-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.create-lobby-form input,
.create-lobby-form select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.error {
  color: red;
  background: #ffe6e6;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.event-monitor {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ccc;
  padding: 1rem;
}

.event-item {
  border-bottom: 1px solid #eee;
  padding: 0.5rem 0;
}

.event-item:last-child {
  border-bottom: none;
}
```

## 🐛 Error Handling

### Error Types

The integration provides comprehensive error handling:

```typescript
import { parseAnchorError } from "../services/solana/program";

try {
  await createLobby(params);
} catch (error) {
  const errorMessage = parseAnchorError(error);

  // Handle specific errors
  if (errorMessage.includes("Invalid team size")) {
    // Show team size validation error
  } else if (errorMessage.includes("Stake is below minimum")) {
    // Show minimum stake error
  } else {
    // Show generic error
  }
}
```

### Error Display Component

```typescript
interface ErrorDisplayProps {
  error: string | null;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="error-display">
      <div className="error-content">
        <strong>Error:</strong> {error}
        {onDismiss && (
          <button onClick={onDismiss} className="dismiss-button">
            ×
          </button>
        )}
      </div>
    </div>
  );
}
```

## 🧪 Testing

### Unit Tests

```typescript
import { renderHook, act } from "@testing-library/react";
import { usePvpProgram } from "../hooks/usePvpProgram";

describe("usePvpProgram", () => {
  it("should initialize program correctly", async () => {
    const { result } = renderHook(() => usePvpProgram());

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateLobbyForm } from "../components/CreateLobbyForm";

describe("CreateLobbyForm", () => {
  it("should create lobby successfully", async () => {
    render(<CreateLobbyForm />);

    fireEvent.change(screen.getByLabelText("Lobby ID"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Team Size"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Stake (SOL)"), {
      target: { value: "0.1" },
    });

    fireEvent.click(screen.getByText("Create Lobby"));

    await waitFor(() => {
      expect(screen.getByText("Lobby created:")).toBeInTheDocument();
    });
  });
});
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Environment Configuration

Update environment variables for production:

```env
VITE_NETWORK=mainnet-beta
VITE_PROGRAM_ID=YOUR_MAINNET_PROGRAM_ID
VITE_RPC_URL=https://api.mainnet-beta.solana.com
VITE_WS_URL=wss://api.mainnet-beta.solana.com
```

## 📚 Additional Resources

- **Anchor Documentation**: https://www.anchor-lang.com/docs
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **Switchboard VRF**: https://docs.switchboard.xyz/
- **React Hooks**: https://reactjs.org/docs/hooks-intro.html

## 🤝 Support

If you encounter any issues with the frontend integration:

1. Check the browser console for errors
2. Verify your program ID and network configuration
3. Ensure your wallet is connected and has sufficient SOL
4. Check the Solana network status
5. Review the program logs using `solana logs YOUR_PROGRAM_ID`

For additional help, create an issue in the repository or join the Discord community.
