# Game Components

This folder contains game-specific logic for different game types.

## Structure

```
games/
  ├── PickHigherGame.tsx  # PickHigher game (tiles/cards/chests)
  ├── PlinkoGame.tsx      # Plinko game (coming soon)
  └── README.md           # This file
```

## How to Add a New Game

### 1. Create a new game component

Create a new file in this folder, e.g., `MyNewGame.tsx`:

```tsx
import React from "react";

interface MyNewGameProps {
  // Your game-specific props
  onAction: () => void;
  disabled: boolean;
  currentPlayer: string;
}

export const MyNewGame: React.FC<MyNewGameProps> = ({
  onAction,
  disabled,
  currentPlayer,
}) => {
  return (
    <div>
      {/* Your game UI */}
    </div>
  );
};
```

### 2. Use it in UniversalGameBoard.tsx

Import and use your game component:

```tsx
import { MyNewGame } from "./games/MyNewGame";

// In the render:
<GameLayout {...commonProps}>
  {gameType === "MyNewGame" ? (
    <MyNewGame {...gameSpecificProps} />
  ) : (
    <PickHigherGame {...pickHigherProps} />
  )}
</GameLayout>
```

### 3. That's it!

The `GameLayout` component handles:
- ✅ Header (game name, stake, mode, timer)
- ✅ Player cards (scores, usernames, status)
- ✅ Result modal (winners, rewards)

You only need to implement:
- ❌ Game-specific UI (board, controls, animations)
- ❌ Game-specific logic (interactions, state management)

## Common Components (Reusable)

- `GameLayout.tsx` - Wrapper with header, players, timer
- `GameResultModal.tsx` - Shows results (supports Team & DeathMatch modes)
- `WaitingLobby.tsx` - Shows while waiting for players

## Game Types

### Team Mode (1v1, 2v2, 5v5)
- Two teams compete
- Result modal shows team scores
- Winner: team with higher combined score

### DeathMatch Mode (1v10, 2v20, 4v40)
- Many solo players compete
- Result modal shows top winners (1, 2, or 4)
- Winner: player(s) with highest individual score

## Example: PickHigher

See `PickHigherGame.tsx` for a complete example.

It renders different grids based on game mode:
- 3x9: TileGrid (9 tiles, pick 3)
- 5x16: ChestGrid (16 chests, pick 5)
- 1x3: CardRow (3 cards, pick 1)

