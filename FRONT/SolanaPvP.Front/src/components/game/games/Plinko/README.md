# Plinko Game

Drop balls through pins to score points! Classic Plinko-style game with realistic physics.

## Game Modes

- **3 Balls / 5 Rows** - Quick game with 6 slots
- **5 Balls / 7 Rows** - Medium game with 8 slots  
- **7 Balls / 9 Rows** - Extended game with 10 slots

## Slot Distribution

Slots are arranged symmetrically with **lowest values in center, highest on edges**:

```
[500, 250, 200, 150, 100, 75, 50, 20, 10, 5, 1, 5, 10, 20, 50, 75, 100, 150, 200, 250, 500]
                                      ↑
                                   CENTER
```

This makes hitting high values statistically harder (edges are harder to reach).

## How It Works

### Backend
- Generates `targetScore` for each player (outcome predetermined)
- Same fair distribution logic as PickHigher

### Frontend
1. Receives `targetScore` from backend (e.g., 550)
2. Breaks it down into slot combinations (e.g., [500, 50])
3. Animates balls dropping through pins to land in those slots
4. Updates score after each ball lands

### Player Interaction
- **Active Player**: Click "Drop Ball" button for each ball
- **Auto-drop**: If player doesn't click within timeout, ball auto-drops
- **AI Players**: Auto-reveal scores after 12-18 seconds
- **Spectators**: See all players as AI

## Components

### PlinkoBoard
Visual board with:
- Pins arranged in pyramid (row N has N+2 pins)
- Ball physics with bounce animations
- Pin glow effects on collision
- Symmetric slot display at bottom

### PlinkoGame
Game logic with:
- Drop ball button
- Balls remaining counter
- Ball indicators (dropped/current/remaining)
- Auto-drop on timeout

## Integration

Used in `UniversalGameBoard` alongside `PickHigherGame`. Game type determined by `gameType` prop or `gameMode` starting with "Plinko".

## Team Sizes

Same as PickHigher:
- 1v1 (Solo)
- 2v2 (Duo)
- 5v5 (Team)

