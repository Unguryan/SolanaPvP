# Plan: Fix Live Match & Live Feed Updates

## Current Problems

### Live Match Issues:
1. ✅ Lobby created → appears in Live Match (WORKS)
2. ❌ Player joined → NOT updated in Live Match (status still shows 1/2)
3. ❌ Game started (InProgress) → NOT updated in Live Match
4. ❌ Game finished (Resolved) → NOT removed from Live Match

### Live Feed Issues:
1. ❌ Game finished → Winner NOT added to Live Feed

## Root Cause Analysis

### Where are Live Match and Live Feed?

**Pages to check:**
- `FRONT/SolanaPvP.Front/src/pages/Home.tsx` - Home page with feed
- `FRONT/SolanaPvP.Front/src/pages/Matches.tsx` - Arena page with matches list
- `FRONT/SolanaPvP.Front/src/components/arena/MatchesList.tsx` - Matches list component
- `FRONT/SolanaPvP.Front/src/components/home/LiveFeed.tsx` - Feed component (if exists)
- `FRONT/SolanaPvP.Front/src/store/arenaStore.ts` - State management for matches

### Expected SignalR Events:

Backend should send:
1. `matchCreated` - when lobby created ✅
2. `matchJoined` - when player joined ❌ (not updating UI)
3. `matchInProgress` - when game started ❌ (not updating UI)
4. `matchFinalized` - when game ended ❌ (not updating UI + feed)

## Investigation Tasks

### Task 1: Check SignalR Event Handlers
**Files to examine:**
- `FRONT/SolanaPvP.Front/src/store/arenaStore.ts`
- `FRONT/SolanaPvP.Front/src/store/websocketStore.ts`
- `FRONT/SolanaPvP.Front/src/hooks/useArenaRealtime.ts`

**Questions:**
- Are `matchJoined`, `matchInProgress`, `matchFinalized` handlers implemented?
- Do they update the `matches` state in arenaStore?
- Do they filter out Resolved matches from Live Match?
- Do they add winners to Live Feed?

### Task 2: Check Backend SignalR Broadcasting
**Files to examine:**
- `API/SolanaPvP.API_Project/Hubs/MatchHub.cs`
- `API/SolanaPvP.API_Project/Workers/IndexerWorker.cs`

**Questions:**
- Does `NotifyMatchJoined()` exist and broadcast correctly?
- Does `NotifyMatchInProgress()` exist and broadcast correctly?
- Does `NotifyMatchFinalized()` exist and broadcast correctly?
- Are feed items generated when match finalizes?

### Task 3: Check Live Feed Logic
**Files to examine:**
- Feed component/store
- Feed API endpoints

**Questions:**
- How is Live Feed populated?
- Is there a SignalR event for new feed items?
- Are winners automatically added to feed when match resolves?

## Implementation Plan

### Step 1: Verify SignalR Events (Backend)

**File:** `API/SolanaPvP.API_Project/Hubs/MatchHub.cs`

Check if these methods exist:
```csharp
public static async Task NotifyMatchJoined(this IHubContext<MatchHub> hub, string matchPda, MatchView match)
{
    await hub.Clients.All.SendAsync("matchJoined", match);
}

public static async Task NotifyMatchInProgress(this IHubContext<MatchHub> hub, string matchPda, MatchDetails match)
{
    await hub.Clients.All.SendAsync("matchInProgress", match);
}

public static async Task NotifyMatchFinalized(this IHubContext<MatchHub> hub, string matchPda, MatchView match)
{
    await hub.Clients.All.SendAsync("matchFinalized", match);
}
```

**File:** `API/SolanaPvP.API_Project/Workers/IndexerWorker.cs`

Verify these are called:
- Line ~380: `NotifyMatchJoined()` after PlayerJoined event ✅
- Line ~464: `NotifyMatchInProgress()` after MatchResolved event ✅
- Need to add: `NotifyMatchFinalized()` after GameTimeoutWorker finalizes match

### Step 2: Update Frontend Event Handlers

**File:** `FRONT/SolanaPvP.Front/src/hooks/useArenaRealtime.ts`

Add/update handlers:
```typescript
// Handle match joined
onMatchJoined((match) => {
  // Update match in store (participant count, status)
  updateMatch(match.matchPda, match);
});

// Handle match in progress
onMatchInProgress((match) => {
  // Update match status to InProgress
  updateMatch(match.matchPda, match);
});

// Handle match finalized
onMatchFinalized((match) => {
  // Remove from Live Match (if Resolved)
  if (match.status === "Resolved") {
    removeMatch(match.matchPda);
  }
  // Add winner to Live Feed
  addFeedItem({
    username: match.winnerUsername,
    amount: match.winAmount,
    gameType: match.gameType,
    // ...
  });
});
```

**File:** `FRONT/SolanaPvP.Front/src/store/arenaStore.ts`

Add methods:
```typescript
updateMatch: (matchPda: string, updates: Partial<Match>) => {
  set((state) => ({
    matches: state.matches.map((m) => 
      m.matchPda === matchPda ? { ...m, ...updates } : m
    )
  }));
},

removeMatch: (matchPda: string) => {
  set((state) => ({
    matches: state.matches.filter((m) => m.matchPda !== matchPda)
  }));
},
```

### Step 3: Implement Live Feed Updates

**Check if exists:** `FRONT/SolanaPvP.Front/src/store/feedStore.ts`

If not, create:
```typescript
interface FeedItem {
  id: string;
  matchPda: string;
  username: string;
  winAmount: number;
  gameType: string;
  gameMode: string;
  timestamp: string;
}

interface FeedState {
  items: FeedItem[];
  addItem: (item: FeedItem) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [item, ...state.items].slice(0, 50) // Keep last 50
  })),
}));
```

**File:** `API/SolanaPvP.API_Project/Hubs/MatchHub.cs`

Add method:
```csharp
public static async Task NotifyFeedItem(this IHubContext<MatchHub> hub, FeedItem item)
{
    await hub.Clients.All.SendAsync("feedItemAdded", item);
}
```

**File:** `API/SolanaPvP.API_Project/Workers/GameTimeoutWorker.cs`

After finalizing match:
```csharp
// Broadcast feed item for winner
var feedItem = CreateFeedItem(match);
await _hubContext.NotifyFeedItem(feedItem);
```

### Step 4: Update Live Match Filtering

**File:** `FRONT/SolanaPvP.Front/src/pages/Matches.tsx` or `Home.tsx`

Filter logic:
```typescript
// Live Match: only Open, Pending, InProgress
const activeMatches = matches.filter(m => 
  m.status === "Open" || 
  m.status === "Pending" || 
  m.status === "InProgress"
);

// Resolved matches should NOT appear in Live Match
const resolvedMatches = matches.filter(m => m.status === "Resolved");
```

## Testing Checklist

After implementation, test this flow:

1. **Create Lobby**
   - [ ] Appears in Live Match immediately
   - [ ] Shows 1/2 players
   - [ ] Status: "Open"

2. **Player Joins**
   - [ ] Live Match updates to 2/2 players
   - [ ] Status changes to "Pending"
   - [ ] Both players visible

3. **Game Starts (VRF resolved)**
   - [ ] Status changes to "InProgress"
   - [ ] Timer starts counting

4. **Game Finishes**
   - [ ] Match disappears from Live Match
   - [ ] Winner appears in Live Feed
   - [ ] Feed shows: username, win amount, game type

## Files That Need Changes

### Backend:
- ✅ `API/SolanaPvP.API_Project/Hubs/MatchHub.cs` - Add missing NotifyMatchFinalized
- ⚠️ `API/SolanaPvP.API_Project/Workers/GameTimeoutWorker.cs` - Call NotifyMatchFinalized + feed
- ⚠️ `API/SolanaPvP.API_Project/Workers/IndexerWorker.cs` - Already calls NotifyMatchJoined/InProgress

### Frontend:
- ⚠️ `FRONT/SolanaPvP.Front/src/hooks/useArenaRealtime.ts` - Add event handlers
- ⚠️ `FRONT/SolanaPvP.Front/src/store/arenaStore.ts` - Add updateMatch/removeMatch methods
- ⚠️ `FRONT/SolanaPvP.Front/src/store/feedStore.ts` - Create if doesn't exist
- ⚠️ `FRONT/SolanaPvP.Front/src/store/websocketStore.ts` - Add onFeedItemAdded handler
- ⚠️ `FRONT/SolanaPvP.Front/src/pages/Home.tsx` - Use feed store
- ⚠️ `FRONT/SolanaPvP.Front/src/pages/Matches.tsx` - Filter by status

## Priority Order

1. **HIGH:** Fix match status updates (Joined, InProgress)
2. **HIGH:** Remove Resolved matches from Live Match
3. **MEDIUM:** Add winners to Live Feed
4. **LOW:** Polish feed UI/animations

## Notes

- SignalR events are already partially implemented (matchCreated works)
- Need to ensure all events update the same store
- Consider using optimistic updates for better UX
- May need to add API endpoint to fetch initial feed on page load

