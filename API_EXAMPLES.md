# Solana PvP API Examples

## Authentication

All user-specific endpoints require the `X-User-Pubkey` header with the user's Solana public key.

## JavaScript/TypeScript Examples

### Setup

```typescript
const API_BASE = "https://localhost:5001/api";
const USER_PUBKEY = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

const headers = {
  "Content-Type": "application/json",
  "X-User-Pubkey": USER_PUBKEY,
};
```

### Get Current User Profile

```typescript
async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: { "X-User-Pubkey": USER_PUBKEY },
  });
  return await response.json();
}
```

### Get Active Matches

```typescript
async function getActiveMatches(page = 1, pageSize = 20) {
  const response = await fetch(
    `${API_BASE}/matches/active?page=${page}&pageSize=${pageSize}`
  );
  return await response.json();
}
```

### Create Match Invitation

```typescript
async function createInvitation(
  inviteePubkey: string,
  gameMode: string,
  matchType: string,
  stakeLamports: number
) {
  const response = await fetch(`${API_BASE}/invitations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inviteePubkey,
      gameMode,
      matchType,
      stakeLamports,
      expirationMinutes: 30,
    }),
  });
  return await response.json();
}
```

### Accept Invitation

```typescript
async function acceptInvitation(invitationId: number) {
  const response = await fetch(
    `${API_BASE}/invitations/${invitationId}/accept`,
    {
      method: "POST",
      headers: { "X-User-Pubkey": USER_PUBKEY },
    }
  );
  return await response.json();
}
```

### Get My Invitations

```typescript
async function getMyInvitations(status?: string) {
  const url = status
    ? `${API_BASE}/invitations/me?status=${status}`
    : `${API_BASE}/invitations/me`;

  const response = await fetch(url, {
    headers: { "X-User-Pubkey": USER_PUBKEY },
  });
  return await response.json();
}
```

### Change Username

```typescript
async function changeUsername(newUsername: string) {
  const response = await fetch(`${API_BASE}/users/me/username`, {
    method: "POST",
    headers,
    body: JSON.stringify({ username: newUsername }),
  });
  return await response.json();
}
```

### Check Username Availability

```typescript
async function checkUsernameAvailability(username: string) {
  const response = await fetch(
    `${API_BASE}/users/username/available?username=${username}`
  );
  return await response.json();
}
```

### Get Leaderboard

```typescript
async function getLeaderboard(
  type: "winrate" | "earnings",
  period: "alltime" | "monthly",
  page = 1
) {
  const response = await fetch(
    `${API_BASE}/leaderboard?type=${type}&period=${period}&page=${page}`
  );
  return await response.json();
}
```

## WebSocket Connection (SignalR)

```typescript
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("https://localhost:5000/ws")
  .build();

// Join lobby for new matches
await connection.invoke("JoinLobby");

// Join specific match group
await connection.invoke("JoinMatchGroup", matchPda);

// Listen for events
connection.on("matchCreated", (match) => {
  console.log("New match created:", match);
});

connection.on("matchJoined", (match) => {
  console.log("Match joined:", match);
});

connection.on("matchResolved", (match) => {
  console.log("Match resolved:", match);
});

connection.on("matchRefunded", (match) => {
  console.log("Match refunded:", match);
});

await connection.start();
```

## cURL Examples

### Get Current User

```bash
curl -H "X-User-Pubkey: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" \
     https://localhost:5001/api/users/me
```

### Create Invitation

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-User-Pubkey: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" \
  -d '{
    "inviteePubkey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "gameMode": "PickThreeFromNine",
    "matchType": "Solo",
    "stakeLamports": 1000000000,
    "expirationMinutes": 30
  }' \
  https://localhost:5001/api/invitations
```

### Accept Invitation

```bash
curl -X POST \
  -H "X-User-Pubkey: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  https://localhost:5001/api/invitations/123/accept
```

### Get Active Matches

```bash
curl https://localhost:5001/api/matches/active?page=1&pageSize=20
```

### Get Leaderboard

```bash
curl "https://localhost:5001/api/leaderboard?type=winrate&period=alltime&page=1&pageSize=50"
```

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK` - Success
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid pubkey header
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a message:

```json
{
  "message": "Username is already taken"
}
```

## Game Modes

- `PickThreeFromNine` - Choose 3 cards from 9
- `PickFiveFromSixteen` - Choose 5 chests from 16
- `PickOneFromThree` - Choose 1 card from 3

## Match Types

- `Solo` - 1v1
- `Duo` - 2v2
- `Team` - 5v5

## Invitation Statuses

- `Pending` - Waiting for response
- `Accepted` - Invitation accepted
- `Declined` - Invitation declined
- `Expired` - Invitation expired
- `Cancelled` - Invitation cancelled
