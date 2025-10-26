# Solana PvP MVP Backend

A complete backend infrastructure for Solana PvP matches with real-time indexing, game data generation, refund automation, and WebSocket updates.

## Features

- **Real-time Blockchain Indexing**: WebSocket subscription to Solana program events
- **Game Data Generation**: Fair score generation for multiple game modes (3 from 9, 5 from 16, 1 from 3)
- **Match Types**: Support for Solo (1v1), Duo (2v2), and Team (5v5) matches
- **Auto-refund System**: Automatic refunds for unjoined matches after 2 minutes
- **REST API**: Complete API for matches, users, and health checks
- **SignalR Hub**: Real-time updates for match events
- **Clean Architecture**: Domain-driven design with proper separation of concerns

## Architecture

```
SolanaPvP/
├── API/
│   ├── SolanaPvP.API_Project/     # Web API, Controllers, SignalR Hub, Background Workers
│   ├── SolanaPvP.Application/     # Interfaces and Contracts
│   ├── SolanaPvP.Domain/          # Core Models, Enums, Settings
│   ├── SolanaPvP.EF_Core/         # Database Layer (DBOs, Mappers, Repositories)
│   ├── SolanaPvP.Infrastructure/  # Service Implementations
│   └── SolanaPvP.SolanaRPC/       # Blockchain Integration
├── FRONT/                          # Frontend (React)
└── Solana_SC/                      # Solana Smart Contracts
```

## Quick Start

### Prerequisites

- .NET 9.0 SDK
- SQLite (included with .NET)

### Setup

1. **Clone and build**:

   ```bash
   git clone <repository>
   cd SolanaPvP/API
   dotnet restore
   dotnet build
   ```

2. **Configure settings** in `SolanaPvP.API_Project/appsettings.json`:

   ```json
   {
     "Solana": {
       "ProgramId": "YOUR_PROGRAM_ID_HERE",
       "RpcPrimaryUrl": "https://api.mainnet-beta.solana.com",
       "RpcFallbackUrl": "https://solana-api.projectserum.com",
       "WsUrl": "wss://api.mainnet-beta.solana.com",
       "TreasuryPubkey": "YOUR_TREASURY_PUBKEY_HERE",
       "RefundBotKeypairPath": "refund-bot-keypair.json"
     }
   }
   ```

3. **Run the application**:

   ```bash
   cd SolanaPvP.API_Project
   dotnet run
   ```

4. **Database**: SQLite database will be created automatically on first run.

## API Endpoints

### Matches

- `GET /api/matches` - List matches with pagination and filtering
- `GET /api/matches/active` - Get active matches (waiting/awaiting randomness, public only)
- `GET /api/matches/{matchPda}` - Get match details

### Users

- `GET /api/users/me` - Get current user profile (requires X-User-Pubkey header)
- `GET /api/users/{pubkey}` - Get user profile with stats
- `GET /api/users/username/{username}` - Get user profile by username
- `POST /api/users/me/username` - Change current user's username (24h cooldown, requires X-User-Pubkey header)
- `GET /api/users/username/available` - Check username availability

### Leaderboard

- `GET /api/leaderboard` - Get leaderboard (winrate, earnings, all-time/monthly)
- `GET /api/leaderboard/winrate` - Get win rate leaderboard
- `GET /api/leaderboard/earnings` - Get earnings leaderboard

### Invitations

- `POST /api/invitations` - Create match invitation (requires X-User-Pubkey header)
- `GET /api/invitations/{invitationId}` - Get invitation details
- `GET /api/invitations/me` - Get current user's invitations (requires X-User-Pubkey header)
- `GET /api/invitations/user/{pubkey}` - Get user invitations
- `POST /api/invitations/{invitationId}/accept` - Accept invitation (requires X-User-Pubkey header)
- `POST /api/invitations/{invitationId}/decline` - Decline invitation (requires X-User-Pubkey header)
- `POST /api/invitations/{invitationId}/cancel` - Cancel invitation (requires X-User-Pubkey header)

### Health

- `GET /api/health` - Health check (database, RPC, WebSocket status)

### WebSocket

- `ws://localhost:5000/ws` - SignalR hub for real-time updates

## Authentication

The API uses a simple header-based authentication system:

### Required Headers

For endpoints that require user identification, include one of these headers:

- `X-User-Pubkey` (preferred) - User's Solana public key
- `X-Pubkey` - Alternative header name
- `User-Pubkey` - Alternative header name
- `Pubkey` - Simple version

### Example

```bash
curl -H "X-User-Pubkey: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" \
     https://localhost:5001/api/users/me
```

### Pubkey Validation

The middleware validates that the pubkey:

- Is 32-44 characters long (typical Solana pubkey length)
- Contains only valid base58 characters
- Is not empty or whitespace

## Configuration

### appsettings.json Schema

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=solanapvp.db"
  },
  "Solana": {
    "ProgramId": "string", // Your Solana program ID
    "RpcPrimaryUrl": "string", // Primary RPC endpoint
    "RpcFallbackUrl": "string", // Fallback RPC endpoint
    "WsUrl": "string", // WebSocket endpoint
    "TreasuryPubkey": "string", // Treasury wallet pubkey
    "RefundBotKeypairPath": "string" // Path to refund bot keypair
  },
  "Indexer": {
    "StartSlot": 0, // Starting slot for indexing
    "BackfillBatch": 100 // Batch size for backfill
  },
  "Refund": {
    "CheckPeriodSeconds": 15, // How often to check for refunds
    "BatchSize": 50 // Max refunds to process per cycle
  },
  "Commission": {
    "CommissionBps": 100 // Commission in basis points (100 = 1%)
  }
}
```

## Database Schema

### Tables

- **Matches**: Core match information (PDA, game mode, status, stakes)
- **MatchParticipants**: Players in each match (pubkey, side, position, target score)
- **GameData**: Generated game data (total scores for each side)
- **Events**: Blockchain events (created, joined, resolved, refunded)
- **RefundTasks**: Scheduled refund tasks
- **Users**: User profiles and statistics

### Migrations

The application uses Entity Framework Core with SQLite. Database is created automatically on first run.

To create a migration manually:

```bash
cd SolanaPvP.EF_Core
dotnet ef migrations add InitialCreate --startup-project ../SolanaPvP.API_Project
```

## Background Workers

### IndexerWorker

- Subscribes to Solana WebSocket for program events
- Parses Anchor events (MatchCreated, MatchJoined, MatchResolved, MatchRefunded)
- Updates database and sends SignalR notifications
- Handles reconnection with exponential backoff

### RefundBotWorker

- Periodically checks for expired refund tasks
- Executes refund transactions for unjoined matches
- Updates match status and task execution records

## Game Data Generation

The system generates fair-looking game data after blockchain resolution:

1. **Winner Determination**: Blockchain VRF determines the actual winner
2. **Score Generation**: Backend generates realistic scores (winner 5-15% higher)
3. **Distribution**: For team matches, scores are distributed among team members
4. **Frontend Integration**: Frontend receives target scores and generates interactive game elements

### Game Modes

- **PickThreeFromNine**: 3 cards from 9, sum to target score
- **PickFiveFromSixteen**: 5 chests from 16, sum to target score
- **PickOneFromThree**: 1 card from 3, sum to target score

## SignalR Events

### Client → Server

- `JoinMatchGroup(matchPda)` - Join match-specific group
- `JoinLobby()` - Join general lobby for new matches

### Server → Client

- `matchCreated` - New match created
- `matchJoined` - Player joined match
- `matchResolved` - Match completed with results
- `matchRefunded` - Match refunded due to timeout

## Development

### Project Structure

- **Domain**: Pure business logic, no dependencies
- **Application**: Interfaces and contracts
- **EF_Core**: Data access layer with Entity Framework
- **Infrastructure**: Service implementations
- **SolanaRPC**: Blockchain integration
- **API_Project**: Web API, controllers, background services

### Adding New Features

1. Add domain models in `SolanaPvP.Domain`
2. Create interfaces in `SolanaPvP.Application`
3. Implement services in `SolanaPvP.Infrastructure`
4. Add API endpoints in `SolanaPvP.API_Project`

## Deployment

### Environment Variables

Set these environment variables for production:

```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection="Data Source=/app/data/solanapvp.db"
Solana__ProgramId="YOUR_PROGRAM_ID"
Solana__RpcPrimaryUrl="https://api.mainnet-beta.solana.com"
Solana__WsUrl="wss://api.mainnet-beta.solana.com"
Solana__TreasuryPubkey="YOUR_TREASURY_PUBKEY"
Solana__RefundBotKeypairPath="/app/keys/refund-bot-keypair.json"
```

### Docker

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY . .
RUN dotnet restore
RUN dotnet build
EXPOSE 80
ENTRYPOINT ["dotnet", "SolanaPvP.API_Project.dll"]
```

## Monitoring

### Health Checks

The `/api/health` endpoint provides:

- Database connectivity status
- RPC endpoint status
- WebSocket connection status
- Overall system health

### Logging

Application uses structured logging with different levels:

- **Information**: Normal operations, match events
- **Warning**: Recoverable issues, fallback usage
- **Error**: Failed operations, connection issues

## Security

- Program ID validation in event parsing
- Transaction signature verification
- Secure keypair handling for refund bot
- CORS configuration for frontend integration

## Performance

- Pagination for match listings
- Efficient database queries with proper indexing
- WebSocket connection pooling
- Background task batching
- Connection retry with exponential backoff

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**

   - Check RPC endpoint URLs
   - Verify network connectivity
   - Check firewall settings

2. **Database Errors**

   - Ensure SQLite file permissions
   - Check connection string
   - Run migrations if needed

3. **Refund Bot Not Working**
   - Verify keypair file exists and is readable
   - Check RPC endpoint connectivity
   - Review refund settings

### Logs

Check application logs for detailed error information:

```bash
dotnet run --verbosity normal
```

## Contributing

1. Follow clean architecture principles
2. Add unit tests for new features
3. Update documentation for API changes
4. Ensure all background workers handle errors gracefully

## License

[Your License Here]
