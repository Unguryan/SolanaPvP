using Microsoft.AspNetCore.SignalR;
using SolanaPvP.API_Project.Hubs;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;
using SolanaPvP.Domain.Settings;
using System.Collections.Concurrent;
using MatchType = SolanaPvP.Domain.Enums.MatchType;

namespace SolanaPvP.API_Project.Workers;

public class IndexerWorker : BackgroundService
{
    private readonly ILogger<IndexerWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly SolanaSettings _solanaSettings;
    private readonly IndexerSettings _indexerSettings;
    private readonly IWsSubscriber _wsSubscriber;
    private readonly IHubContext<MatchHub> _hubContext;
    
    // In-memory deduplication: store last 1000 signatures
    private readonly ConcurrentDictionary<string, byte> _processedSignatures = new();
    private const int MAX_SIGNATURES = 1000;

    public IndexerWorker(
        ILogger<IndexerWorker> logger,
        IServiceProvider serviceProvider,
        SolanaSettings solanaSettings,
        IndexerSettings indexerSettings,
        IWsSubscriber wsSubscriber,
        IHubContext<MatchHub> hubContext)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _solanaSettings = solanaSettings;
        _indexerSettings = indexerSettings;
        _wsSubscriber = wsSubscriber;
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("IndexerWorker started");
        _logger.LogInformation("Monitoring program: {ProgramId}", _solanaSettings.ProgramId);
        _logger.LogInformation("RPC URL: {RpcUrl}", _solanaSettings.RpcPrimaryUrl);
        _logger.LogInformation("WS URL: {WsUrl}", _solanaSettings.WsUrl);

        try
        {
            // Start WebSocket subscription
            _logger.LogInformation("Subscribing to program logs via WebSocket...");
            await _wsSubscriber.SubscribeLogsAsync(_solanaSettings.ProgramId, OnLogEvent, stoppingToken);
            _logger.LogInformation("Successfully subscribed to program logs");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "IndexerWorker failed to start subscription");
        }
    }

    private async void OnLogEvent(WsLogEvent logEvent)
    {
        try
        {
            _logger.LogDebug("Received log event - Signature: {Signature}, Slot: {Slot}, Logs count: {Count}", 
                logEvent.Signature, logEvent.Slot, logEvent.Logs?.Count ?? 0);

            // Check if we've already processed this event (in-memory deduplication)
            if (_processedSignatures.ContainsKey(logEvent.Signature))
            {
                _logger.LogDebug("Event already processed, skipping: {Signature}", logEvent.Signature);
                return;
            }

            using var scope = _serviceProvider.CreateScope();
            var eventParser = scope.ServiceProvider.GetRequiredService<IEventParser>();
            var matchRepository = scope.ServiceProvider.GetRequiredService<IMatchRepository>();
            var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var refundScheduler = scope.ServiceProvider.GetRequiredService<IRefundScheduler>();
            var gameDataGenerator = scope.ServiceProvider.GetRequiredService<IGameDataGenerator>();
            var indexerStateManager = scope.ServiceProvider.GetRequiredService<IIndexerStateManager>();
            var matchService = scope.ServiceProvider.GetRequiredService<IMatchService>();

            // Log all log lines for debugging
            if (logEvent.Logs != null && logEvent.Logs.Count > 0)
            {
                _logger.LogDebug("Transaction logs:");
                foreach (var logLine in logEvent.Logs)
                {
                    _logger.LogDebug("  > {LogLine}", logLine);
                }
            }

            // Parse logs for our program events
            int parsedCount = 0;
            foreach (var logLine in logEvent.Logs)
            {
                var parsedEvent = eventParser.ParseProgramLog(logLine);
                if (parsedEvent == null) continue;

                parsedCount++;
                _logger.LogInformation("Parsed event: {EventKind} for match {MatchPda}", 
                    parsedEvent.Kind, parsedEvent.MatchPda);
                
                await ProcessEventAsync(parsedEvent, logEvent, scope.ServiceProvider);
            }

            if (parsedCount == 0)
            {
                _logger.LogDebug("No parseable events found in transaction {Signature}", logEvent.Signature);
            }

            // Mark signature as processed
            _processedSignatures.TryAdd(logEvent.Signature, 0);
            
            // Clean up old signatures if we exceed the limit
            if (_processedSignatures.Count > MAX_SIGNATURES)
            {
                var keysToRemove = _processedSignatures.Keys.Take(_processedSignatures.Count - MAX_SIGNATURES).ToList();
                foreach (var key in keysToRemove)
                {
                    _processedSignatures.TryRemove(key, out _);
                }
                _logger.LogDebug("Cleaned up {Count} old signatures from cache", keysToRemove.Count);
            }

            // Update last processed slot
            await indexerStateManager.SetLastProcessedSlotAsync(logEvent.Slot);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing log event {Signature}", logEvent.Signature);
        }
    }

    private async Task ProcessEventAsync(ParsedEvent parsedEvent, WsLogEvent logEvent, IServiceProvider serviceProvider)
    {
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();
        var gameDataGenerator = serviceProvider.GetRequiredService<IGameDataGenerator>();
        var matchService = serviceProvider.GetRequiredService<IMatchService>();

        // Log event to file for debugging
        _logger.LogInformation("[Event] {EventKind} - Match: {MatchPda} - Signature: {Signature} - Slot: {Slot}", 
            parsedEvent.Kind, parsedEvent.MatchPda, logEvent.Signature, logEvent.Slot);

        // Process based on event type
        switch (parsedEvent.Kind)
        {
            case EventKind.MatchCreated:
                await ProcessMatchCreatedAsync(parsedEvent, logEvent.Signature, serviceProvider);
                break;
            case EventKind.MatchJoined:
                await ProcessMatchJoinedAsync(parsedEvent, logEvent.Signature, serviceProvider);
                break;
            case EventKind.MatchResolved:
                await ProcessMatchResolvedAsync(parsedEvent, logEvent.Signature, serviceProvider);
                break;
            case EventKind.MatchRefunded:
                await ProcessMatchRefundedAsync(parsedEvent, logEvent.Signature, serviceProvider);
                break;
        }
    }

    private async Task ProcessMatchCreatedAsync(ParsedEvent parsedEvent, string signature, IServiceProvider serviceProvider)
    {
        _logger.LogInformation("[ProcessMatchCreated] Starting processing for {MatchPda}", parsedEvent.MatchPda);
        
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();
        var matchService = serviceProvider.GetRequiredService<IMatchService>();

        // Check if match already exists (deduplication)
        var existingMatch = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (existingMatch != null)
        {
            _logger.LogWarning("[ProcessMatchCreated] Match {MatchPda} already exists, skipping creation", parsedEvent.MatchPda);
            return;
        }

        // Parse match creation data from payload
        _logger.LogDebug("[ProcessMatchCreated] Parsing payload: {Payload}", parsedEvent.PayloadJson);
        var matchData = ParseMatchCreatedPayload(parsedEvent.PayloadJson);
        if (matchData == null)
        {
            _logger.LogWarning("[ProcessMatchCreated] Failed to parse match data for {MatchPda}", parsedEvent.MatchPda);
            return;
        }

        // Create match
        var match = new Match
        {
            MatchPda = parsedEvent.MatchPda,
            CreatorPubkey = matchData.Creator,
            GameMode = matchData.GameMode,
            MatchType = matchData.MatchType,
            StakeLamports = matchData.StakeLamports,
            Status = MatchStatus.Open,
            DeadlineTs = matchData.DeadlineTs,
            CreateTx = signature,
            CreatedAt = DateTime.UtcNow,
            RandomnessAccount = null // Will be set when lobby becomes full
        };

        await matchRepository.CreateAsync(match);
        _logger.LogInformation("[ProcessMatchCreated] Match saved to DB: {MatchPda}", parsedEvent.MatchPda);

        // Create creator participant
        var creatorParticipant = new MatchParticipant
        {
            MatchPda = parsedEvent.MatchPda,
            Pubkey = matchData.Creator,
            Side = 0,
            Position = 0
        };
        
        // Add participant to match (explicitly to DbSet to ensure it's saved)
        await matchRepository.AddParticipantAsync(creatorParticipant);
        _logger.LogDebug("[ProcessMatchCreated] Creator participant added to match");

        // Update LastSeen for creator (or create if first time from blockchain)
        try
        {
            await userRepository.UpdateLastSeenAsync(matchData.Creator);
            _logger.LogDebug("[ProcessMatchCreated] User LastSeen updated: {Creator}", matchData.Creator);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[ProcessMatchCreated] Failed to update LastSeen for {Creator}, continuing anyway", matchData.Creator);
        }

        // Schedule refund task with deadline based on team size
        // 1v1: 2 minutes, 2v2: 5 minutes, 5v5: 10 minutes
        int refundDelaySeconds = match.MatchType switch
        {
            MatchType.Solo => 120,  // 2 minutes
            MatchType.Duo => 300,   // 5 minutes
            MatchType.Team => 600,  // 10 minutes
            _ => 120
        };
        long refundDeadline = ((DateTimeOffset)match.CreatedAt).ToUnixTimeSeconds() + refundDelaySeconds;
        await refundScheduler.ScheduleAsync(parsedEvent.MatchPda, refundDeadline);
        _logger.LogDebug("[ProcessMatchCreated] Refund task scheduled for {MatchPda} with {Delay}s delay", parsedEvent.MatchPda, refundDelaySeconds);

        _logger.LogInformation("✅ Match created successfully: {MatchPda} by {Creator}", 
            parsedEvent.MatchPda, matchData.Creator);

        // Broadcast to all clients via SignalR
        var matchView = await matchService.GetMatchAsync(parsedEvent.MatchPda);
        if (matchView != null)
        {
            await _hubContext.NotifyMatchCreated(ConvertToMatchView(matchView));
            _logger.LogDebug("[ProcessMatchCreated] Broadcasted match created to clients");
        }
    }

    private async Task ProcessMatchJoinedAsync(ParsedEvent parsedEvent, string signature, IServiceProvider serviceProvider)
    {
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();
        var matchService = serviceProvider.GetRequiredService<IMatchService>();

        // Parse join data
        _logger.LogDebug("[ProcessMatchJoined] Parsing payload: {Payload}", parsedEvent.PayloadJson);
        var joinData = ParseMatchJoinedPayload(parsedEvent.PayloadJson);
        if (joinData == null) return;
        
        _logger.LogDebug("[ProcessMatchJoined] Parsed data - Player: {Player}, RandomnessAccount: {RandomnessAccount}, IsFull: {IsFull}",
            joinData.Player, joinData.RandomnessAccount, joinData.IsFull);

        // Get existing match
        var match = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (match == null) return;

        // Update match status to Pending
        match.Status = MatchStatus.Pending;
        match.PendingAt = DateTime.UtcNow;
        match.JoinedAt = DateTime.UtcNow;
        match.JoinTx = signature;
        
        // Check if participant already exists (prevent duplicates from repeated transactions)
        var existingParticipant = match.Participants.FirstOrDefault(p => p.Pubkey == joinData.Player);
        if (existingParticipant == null)
        {
            // Create joiner participant and add to DbSet explicitly
            var joinerParticipant = new MatchParticipant
            {
                MatchPda = parsedEvent.MatchPda,
                Pubkey = joinData.Player,
                Side = 1,
                Position = 0
            };
            
            await matchRepository.AddParticipantAsync(joinerParticipant);
            _logger.LogDebug("[ProcessMatchJoined] Joiner participant added to match");
        }
        else
        {
            _logger.LogWarning("[ProcessMatchJoined] Player {Player} already in match, skipping duplicate", joinData.Player);
        }
        
        // Save randomness account if lobby is full
        if (joinData.IsFull && !string.IsNullOrWhiteSpace(joinData.RandomnessAccount))
        {
            match.RandomnessAccount = joinData.RandomnessAccount;
            await matchRepository.UpdateAsync(match);
            _logger.LogInformation("[ProcessMatchJoined] Saved randomness account {Account} for match {MatchPda}", 
                joinData.RandomnessAccount, match.MatchPda);
            
            // Immediately try to resolve (with retry logic)
            var matchPda = match.MatchPda;
            var randomnessAccount = joinData.RandomnessAccount;
            
            _ = Task.Run(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var resolveSender = scope.ServiceProvider.GetRequiredService<IResolveSender>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<IndexerWorker>>();
                
                // Retry up to 10 times (2 sec delay between attempts)
                for (int attempt = 1; attempt <= 10; attempt++)
                {
                    try
                    {
                        await Task.Delay(2000); // Wait 2 seconds for VRF fulfill
                        
                        logger.LogInformation("[IndexerWorker] Attempt {Attempt}/10 to resolve match {MatchPda}", 
                            attempt, matchPda);
                        
                        var resolveSignature = await resolveSender.SendResolveMatchAsync(matchPda, randomnessAccount);
                        
                        if (!string.IsNullOrEmpty(resolveSignature))
                        {
                            logger.LogInformation("[IndexerWorker] ✅ Successfully resolved match {MatchPda} on attempt {Attempt}", 
                                matchPda, attempt);
                            return; // Success - exit retry loop
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "[IndexerWorker] Attempt {Attempt}/10 failed for {MatchPda}", 
                            attempt, matchPda);
                    }
                }
                
                // All 10 attempts failed - log for admin intervention
                logger.LogError("[IndexerWorker] ❌ Failed to resolve match {MatchPda} after 10 attempts. Manual force-refund needed.", 
                    matchPda);
            });
        }

        // Update LastSeen for player (or create if first time from blockchain)
        try
        {
            await userRepository.UpdateLastSeenAsync(joinData.Player);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[ProcessMatchJoined] Failed to update LastSeen for {Player}, continuing anyway", joinData.Player);
        }

        // Cancel refund task
        await refundScheduler.CancelAsync(parsedEvent.MatchPda);

        _logger.LogInformation("Match joined: {MatchPda}", parsedEvent.MatchPda);

        // Broadcast to all clients via SignalR
        var matchView = await matchService.GetMatchAsync(parsedEvent.MatchPda);
        if (matchView != null)
        {
            await _hubContext.NotifyMatchJoined(parsedEvent.MatchPda, ConvertToMatchView(matchView));
            _logger.LogDebug("[ProcessMatchJoined] Broadcasted match updated to clients");
        }
    }

    private async Task ProcessMatchResolvedAsync(ParsedEvent parsedEvent, string signature, IServiceProvider serviceProvider)
    {
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var gameDataGenerator = serviceProvider.GetRequiredService<IGameDataGenerator>();
        var matchService = serviceProvider.GetRequiredService<IMatchService>();

        // Parse resolution data
        var resolutionData = ParseMatchResolvedPayload(parsedEvent.PayloadJson);
        if (resolutionData == null) return;

        // Get existing match
        var match = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (match == null) return;

        // Generate game data based on winner_side
        var gameData = await gameDataGenerator.GenerateGameDataAsync(match, resolutionData.WinnerSide);
        
        // Update match to InProgress
        match.Status = MatchStatus.InProgress;
        match.WinnerSide = resolutionData.WinnerSide;
        match.GameStartTime = DateTime.UtcNow.AddSeconds(3); // +3 sec for frontend to load
        match.PayoutTx = signature;
        match.GameData = gameData;
        await matchRepository.UpdateAsync(match);

        _logger.LogInformation("[ProcessMatchResolved] Match {MatchPda} moved to InProgress, game will end at {EndTime}", 
            parsedEvent.MatchPda, match.GameStartTime.Value.AddSeconds(20));

        // Broadcast to all clients via SignalR
        var matchDetails = await matchService.GetMatchAsync(parsedEvent.MatchPda);
        if (matchDetails != null)
        {
            await _hubContext.NotifyMatchInProgress(parsedEvent.MatchPda, matchDetails);
            _logger.LogDebug("[ProcessMatchResolved] Broadcasted match InProgress to clients");
        }
    }

    private async Task ProcessMatchRefundedAsync(ParsedEvent parsedEvent, string signature, IServiceProvider serviceProvider)
    {
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();
        var matchService = serviceProvider.GetRequiredService<IMatchService>();

        // Parse refund data
        var refundData = ParseMatchRefundedPayload(parsedEvent.PayloadJson);
        if (refundData == null) return;

        // Mark refund task as executed (this will update the match status internally)
        await refundScheduler.MarkAsExecutedAsync(parsedEvent.MatchPda, signature);

        _logger.LogInformation("Match refunded: {MatchPda}", parsedEvent.MatchPda);

        // Broadcast to all clients via SignalR
        var matchView = await matchService.GetMatchAsync(parsedEvent.MatchPda);
        if (matchView != null)
        {
            await _hubContext.NotifyMatchRefunded(parsedEvent.MatchPda, ConvertToMatchView(matchView));
            _logger.LogDebug("[ProcessMatchRefunded] Broadcasted match refunded to clients");
        }
    }

    // Parsing methods for blockchain events
    private MatchCreatedData? ParseMatchCreatedPayload(string payloadJson)
    {
        try
        {
            var json = System.Text.Json.JsonDocument.Parse(payloadJson);
            var rawData = json.RootElement.GetProperty("rawData").GetString();
            if (string.IsNullOrEmpty(rawData)) return null;

            var bytes = Convert.FromBase64String(rawData);
            
            // LobbyCreated struct layout:
            // discriminator (8) + lobby (32) + lobby_id (8) + creator (32) + stake_lamports (8) + team_size (1) + created_at (8)
            // Total: 97 bytes
            
            if (bytes.Length < 97)
            {
                _logger.LogWarning("[ParseMatchCreated] Insufficient data: {Length} bytes", bytes.Length);
                return null;
            }

            var offset = 8; // Skip discriminator
            
            // Skip lobby (32 bytes)
            offset += 32;
            
            // Skip lobby_id (8 bytes)
            offset += 8;
            
            // Read creator pubkey (32 bytes) ← ВАЖНО!
            var creatorBytes = bytes.Skip(offset).Take(32).ToArray();
            var creator = new Solnet.Wallet.PublicKey(creatorBytes).Key;
            offset += 32;
            
            // Read stake_lamports (8 bytes)
            var stakeLamports = BitConverter.ToInt64(bytes, offset);
            offset += 8;
            
            // Read team_size (1 byte)
            var teamSize = bytes[offset];
            offset += 1;
            
            // Read created_at (8 bytes)
            var createdAt = BitConverter.ToInt64(bytes, offset);
            
            // Determine GameMode and MatchType based on team_size
            var gameMode = teamSize == 1 ? GameModeType.PickThreeFromNine : GameModeType.PickThreeFromNine;
            var matchType = teamSize == 1 ? Domain.Enums.MatchType.Solo : 
                           teamSize == 2 ? Domain.Enums.MatchType.Duo : 
                           Domain.Enums.MatchType.Team;

            _logger.LogDebug("[ParseMatchCreated] Parsed - Creator: {Creator}, Stake: {Stake}, TeamSize: {TeamSize}", 
                creator, stakeLamports, teamSize);

            return new MatchCreatedData
            {
                Creator = creator,
                StakeLamports = stakeLamports,
                GameMode = gameMode,
                MatchType = matchType,
                DeadlineTs = createdAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ParseMatchCreated] Failed to parse payload");
            return null;
        }
    }
    
    private MatchJoinedData? ParseMatchJoinedPayload(string payloadJson)
    {
        try
        {
            var json = System.Text.Json.JsonDocument.Parse(payloadJson);
            var rawData = json.RootElement.GetProperty("rawData").GetString();
            if (string.IsNullOrEmpty(rawData)) return null;

            var bytes = Convert.FromBase64String(rawData);
            
            // PlayerJoined struct layout:
            // discriminator (8) + lobby (32) + player (32) + side (1) + team1_count (1) + team2_count (1) + is_full (1) + randomness_account (32)
            // Total: 108 bytes
            
            if (bytes.Length < 108)
            {
                _logger.LogWarning("[ParseMatchJoined] Insufficient data: {Length} bytes", bytes.Length);
                return null;
            }

            var offset = 8; // Skip discriminator
            
            // Skip lobby (32 bytes)
            offset += 32;
            
            // Read player pubkey (32 bytes)
            var playerBytes = bytes.Skip(offset).Take(32).ToArray();
            var player = new Solnet.Wallet.PublicKey(playerBytes).Key;
            offset += 32;
            
            // Skip side, team1_count, team2_count (3 bytes)
            offset += 3;
            
            // Read is_full (1 byte)
            var isFull = bytes[offset] != 0;
            offset += 1;
            
            // Read randomness_account (32 bytes)
            var randomnessBytes = bytes.Skip(offset).Take(32).ToArray();
            var randomnessAccount = new Solnet.Wallet.PublicKey(randomnessBytes).Key;
            
            return new MatchJoinedData
            {
                Player = player,
                RandomnessAccount = randomnessAccount,
                IsFull = isFull
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ParseMatchJoined] Failed to parse PlayerJoined event");
            return null;
        }
    }
    
    private MatchResolvedData? ParseMatchResolvedPayload(string payloadJson)
    {
        try
        {
            var json = System.Text.Json.JsonDocument.Parse(payloadJson);
            var rawData = json.RootElement.GetProperty("rawData").GetString();
            if (string.IsNullOrEmpty(rawData)) return null;

            var bytes = Convert.FromBase64String(rawData);
            
            // LobbyResolved struct layout:
            // discriminator (8) + lobby (32) + winner_side (1) + randomness_value (8) + total_pot (8) + platform_fee (8) + payout_per_winner (8)
            // Total: 73 bytes minimum
            
            if (bytes.Length < 73)
            {
                _logger.LogWarning("[ParseMatchResolved] Insufficient data: {Length} bytes", bytes.Length);
                return null;
            }

            var offset = 8; // Skip discriminator
            offset += 32;   // Skip lobby pubkey
            
            // Read winner_side (1 byte)
            var winnerSide = bytes[offset];
            offset += 1;
            
            // Read randomness_value (8 bytes)
            var randomnessValue = BitConverter.ToUInt64(bytes, offset);
            
            return new MatchResolvedData
            {
                WinnerSide = winnerSide,
                RandomnessValue = randomnessValue
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ParseMatchResolved] Failed to parse payload");
            return null;
        }
    }
    private MatchRefundedData? ParseMatchRefundedPayload(string payloadJson) => new MatchRefundedData();

    private MatchView ConvertToMatchView(MatchDetails matchDetails)
    {
        return new MatchView
        {
            MatchPda = matchDetails.MatchPda,
            GameMode = matchDetails.GameMode,
            MatchType = matchDetails.MatchType,
            StakeLamports = matchDetails.StakeLamports,
            Status = matchDetails.Status,
            DeadlineTs = matchDetails.DeadlineTs,
            WinnerSide = matchDetails.WinnerSide,
            CreatedAt = matchDetails.CreatedAt,
            JoinedAt = matchDetails.JoinedAt,
            ResolvedAt = matchDetails.ResolvedAt,
            Participants = matchDetails.Participants
        };
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("IndexerWorker stopping");
        await _wsSubscriber.DisconnectAsync();
        await base.StopAsync(cancellationToken);
    }
}

// Placeholder data classes - these would need to be implemented based on your actual Anchor event structure
public class MatchCreatedData
{
    public string Creator { get; set; } = string.Empty;
    public GameModeType GameMode { get; set; }
    public SolanaPvP.Domain.Enums.MatchType MatchType { get; set; }
    public long StakeLamports { get; set; }
    public long DeadlineTs { get; set; }
}

public class MatchJoinedData
{
    public string Player { get; set; } = string.Empty;
    public string? RandomnessAccount { get; set; }
    public bool IsFull { get; set; }
}

public class MatchResolvedData
{
    public int WinnerSide { get; set; }      // 0 or 1
    public ulong RandomnessValue { get; set; }
}

public class MatchRefundedData
{
    public string RefundTx { get; set; } = string.Empty;
}
