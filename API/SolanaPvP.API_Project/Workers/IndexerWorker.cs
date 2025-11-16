using Microsoft.AspNetCore.SignalR;
using SolanaPvP.API_Project.Hubs;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;
using SolanaPvP.Domain.Settings;
using System.Collections.Concurrent;

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

        // Create match using new architecture
        var match = new Match
        {
            MatchPda = parsedEvent.MatchPda,
            CreatorPubkey = matchData.Creator,
            GameType = matchData.GameType, // From blockchain
            GameMode = matchData.GameMode, // From blockchain
            MatchMode = matchData.MatchMode, // From blockchain  
            TeamSize = matchData.TeamSize, // From blockchain
            StakeLamports = matchData.StakeLamports,
            Status = MatchStatus.Open,
            DeadlineTs = matchData.DeadlineTs,
            CreateTx = signature,
            CreatedAt = DateTime.UtcNow,
            RandomnessAccount = null // Will be set when lobby becomes full
        };

        await matchRepository.CreateAsync(match);
        _logger.LogInformation("[ProcessMatchCreated] Match saved to DB: {MatchPda}", parsedEvent.MatchPda);

        // Use creator's side from blockchain event
        int creatorSide = matchData.CreatorSide;
        int creatorPosition = 0;
        
        _logger.LogInformation("[ProcessMatchCreated] Creator {Creator} joined side {Side}", 
            matchData.Creator, creatorSide);
        
        // Create creator participant
        var creatorParticipant = new MatchParticipant
        {
            MatchPda = parsedEvent.MatchPda,
            Pubkey = matchData.Creator,
            Side = creatorSide,
            Position = creatorPosition
        };
        
        // Add participant to match (explicitly to DbSet to ensure it's saved)
        await matchRepository.AddParticipantAsync(creatorParticipant);
        _logger.LogDebug("[ProcessMatchCreated] Creator participant added to match with side {Side}", creatorSide);

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
        // 1v1: 2 minutes, 2v2: 5 minutes, 5v5: 10 minutes, larger teams: longer
        int refundDelaySeconds = match.TeamSize switch
        {
            "1v1" or "OneVOne" => 120,      // 2 minutes
            "2v2" or "TwoVTwo" => 300,      // 5 minutes
            "5v5" or "FiveVFive" => 600,    // 10 minutes
            "1v10" or "OneVTen" => 900,      // 15 minutes (DeathMatch)
            "2v20" or "TwoVTwenty" => 1200,  // 20 minutes (DeathMatch)
            "4v40" or "FourVForty" => 1800,  // 30 minutes (DeathMatch)
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
        
        _logger.LogInformation("[ProcessMatchJoined] Parsed data - Player: {Player}, Side: {Side}, RandomnessAccount: {RandomnessAccount}, IsFull: {IsFull}",
            joinData.Player, joinData.Side, joinData.RandomnessAccount, joinData.IsFull);

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
            // Determine position: count existing players on this side
            var existingOnSide = match.Participants.Count(p => p.Side == joinData.Side);
            
            // Create joiner participant and add to DbSet explicitly
            var joinerParticipant = new MatchParticipant
            {
                MatchPda = parsedEvent.MatchPda,
                Pubkey = joinData.Player,
                Side = joinData.Side, // Use side from blockchain event
                Position = existingOnSide
            };
            
            await matchRepository.AddParticipantAsync(joinerParticipant);
            _logger.LogInformation("[ProcessMatchJoined] Joiner participant added to match - Side: {Side}, Position: {Position}", 
                joinData.Side, existingOnSide);
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
        _logger.LogInformation("[ProcessMatchResolved] Starting for match {MatchPda}", parsedEvent.MatchPda);
        
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var gameDataGenerator = serviceProvider.GetRequiredService<IGameDataGenerator>();
        var matchService = serviceProvider.GetRequiredService<IMatchService>();

        // Parse resolution data
        _logger.LogDebug("[ProcessMatchResolved] Parsing payload: {Payload}", parsedEvent.PayloadJson);
        var resolutionData = ParseMatchResolvedPayload(parsedEvent.PayloadJson);
        if (resolutionData == null)
        {
            _logger.LogWarning("[ProcessMatchResolved] Failed to parse resolution data");
            return;
        }
        
        _logger.LogInformation("[ProcessMatchResolved] Parsed winner side: {WinnerSide}", resolutionData.WinnerSide);

        // Get existing match
        var match = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (match == null)
        {
            _logger.LogWarning("[ProcessMatchResolved] Match not found in DB: {MatchPda}", parsedEvent.MatchPda);
            return;
        }
        
        _logger.LogInformation("[ProcessMatchResolved] Match found, participants count: {Count}", match.Participants.Count);

        // Generate game data based on winner_side
        _logger.LogInformation("[ProcessMatchResolved] Calling GameDataGenerator...");
        var gameData = await gameDataGenerator.GenerateGameDataAsync(match, resolutionData.WinnerSide);
        _logger.LogInformation("[ProcessMatchResolved] GameData generated successfully");
        
        // Assign targetScore to each participant based on their side
        var side0Participants = match.Participants.Where(p => p.Side == 0).ToList();
        var side1Participants = match.Participants.Where(p => p.Side == 1).ToList();
        
        // Distribute side0 total score among side0 participants
        if (side0Participants.Any())
        {
            int scorePerPlayer = gameData.Side0TotalScore / side0Participants.Count;
            foreach (var participant in side0Participants)
            {
                participant.TargetScore = scorePerPlayer;
                participant.IsWinner = resolutionData.WinnerSide == 0;
                await matchRepository.UpdateParticipantAsync(participant);
            }
        }
        
        // Distribute side1 total score among side1 participants  
        if (side1Participants.Any())
        {
            int scorePerPlayer = gameData.Side1TotalScore / side1Participants.Count;
            foreach (var participant in side1Participants)
            {
                participant.TargetScore = scorePerPlayer;
                participant.IsWinner = resolutionData.WinnerSide == 1;
                await matchRepository.UpdateParticipantAsync(participant);
            }
        }
        
        _logger.LogInformation("[ProcessMatchResolved] Assigned and saved target scores for {Count} participants", match.Participants.Count);
        
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
            
            // LobbyCreated struct layout (NEW):
            // discriminator (8) + lobby (32) + lobby_id (8) + creator (32) + stake_lamports (8) + team_size (1) + created_at (8)
            // + game (String: 4-byte len + data) + game_mode (String: 4-byte len + data) 
            // + arena_type (String: 4-byte len + data) + team_size_str (String: 4-byte len + data)
            // Minimum: 97 bytes (without strings)
            
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
            
            // Read creator pubkey (32 bytes)
            var creatorBytes = bytes.Skip(offset).Take(32).ToArray();
            var creator = new Solnet.Wallet.PublicKey(creatorBytes).Key;
            offset += 32;
            
            // Read stake_lamports (8 bytes)
            var stakeLamports = BitConverter.ToInt64(bytes, offset);
            offset += 8;
            
            // Read team_size (1 byte)
            var teamSizeNum = bytes[offset];
            offset += 1;
            
            // Read created_at (8 bytes)
            var createdAt = BitConverter.ToInt64(bytes, offset);
            offset += 8;
            
            // Read game (String with 4-byte length prefix)
            var gameLen = BitConverter.ToInt32(bytes, offset);
            offset += 4;
            var game = System.Text.Encoding.UTF8.GetString(bytes, offset, gameLen);
            offset += gameLen;
            
            // Read game_mode (String with 4-byte length prefix)
            var gameModeLen = BitConverter.ToInt32(bytes, offset);
            offset += 4;
            var gameMode = System.Text.Encoding.UTF8.GetString(bytes, offset, gameModeLen);
            offset += gameModeLen;
            
            // Read arena_type (String with 4-byte length prefix)
            var arenaTypeLen = BitConverter.ToInt32(bytes, offset);
            offset += 4;
            var arenaType = System.Text.Encoding.UTF8.GetString(bytes, offset, arenaTypeLen);
            offset += arenaTypeLen;
            
            // Read team_size_str (String with 4-byte length prefix)
            var teamSizeStrLen = BitConverter.ToInt32(bytes, offset);
            offset += 4;
            var teamSizeStr = System.Text.Encoding.UTF8.GetString(bytes, offset, teamSizeStrLen);
            offset += teamSizeStrLen;
            
            // Read creator_side (1 byte) - NEW field!
            byte creatorSide = 0;
            if (offset < bytes.Length)
            {
                creatorSide = bytes[offset];
                offset += 1;
            }

            // Map legacy gameMode format to new standard format
            // Blockchain may send "3x9", "5x16", "1x3" -> convert to "PickHigher3v9", "PickHigher5v16", "PickHigher1v3"
            string normalizedGameMode = gameMode;
            if (game == "PickHigher")
            {
                normalizedGameMode = gameMode switch
                {
                    "3x9" => "PickHigher3v9",
                    "5x16" => "PickHigher5v16",
                    "1x3" => "PickHigher1v3",
                    _ => gameMode // Keep as-is if already in new format or unknown
                };
            }

            _logger.LogDebug("[ParseMatchCreated] Parsed - Creator: {Creator}, Game: {Game}, Mode: {GameMode} -> {NormalizedMode}, Arena: {ArenaType}, Team: {TeamSize}, CreatorSide: {CreatorSide}", 
                creator, game, gameMode, normalizedGameMode, arenaType, teamSizeStr, creatorSide);

            return new MatchCreatedData
            {
                Creator = creator,
                GameType = game,
                GameMode = normalizedGameMode,
                MatchMode = arenaType,
                TeamSize = teamSizeStr,
                StakeLamports = stakeLamports,
                DeadlineTs = createdAt,
                CreatorSide = creatorSide
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
            
            // Read side (1 byte)
            var side = bytes[offset];
            offset += 1;
            
            // Skip team1_count, team2_count (2 bytes)
            offset += 2;
            
            // Read is_full (1 byte)
            var isFull = bytes[offset] != 0;
            offset += 1;
            
            // Read randomness_account (32 bytes)
            var randomnessBytes = bytes.Skip(offset).Take(32).ToArray();
            var randomnessAccount = new Solnet.Wallet.PublicKey(randomnessBytes).Key;
            
            return new MatchJoinedData
            {
                Player = player,
                Side = side,
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
            CreatorPubkey = matchDetails.CreatorPubkey,
            GameType = matchDetails.GameType,
            GameMode = matchDetails.GameMode,
            MatchMode = matchDetails.MatchMode,
            TeamSize = matchDetails.TeamSize,
            StakeLamports = matchDetails.StakeLamports,
            Status = matchDetails.Status,
            DeadlineTs = matchDetails.DeadlineTs,
            WinnerSide = matchDetails.WinnerSide,
            CreatedAt = matchDetails.CreatedAt,
            JoinedAt = matchDetails.JoinedAt,
            PendingAt = matchDetails.PendingAt,
            GameStartTime = matchDetails.GameStartTime,
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
    public string GameType { get; set; } = string.Empty; // NEW: "PickHigher", etc.
    public string GameMode { get; set; } = string.Empty; // NEW: "PickHigher1v3", "PickHigher3v9", "PickHigher5v16", "Plinko3Balls", "Miner1v9", etc.
    public string MatchMode { get; set; } = string.Empty; // NEW: "SingleBattle", "DeathMatch"
    public string TeamSize { get; set; } = string.Empty; // CHANGED: "1v1", "2v2", etc.
    public long StakeLamports { get; set; }
    public long DeadlineTs { get; set; }
    public int CreatorSide { get; set; } // NEW: Which team creator joined (0 or 1)
}

public class MatchJoinedData
{
    public string Player { get; set; } = string.Empty;
    public int Side { get; set; } // NEW: Which team player joined (0, 1, 2, ...)
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
