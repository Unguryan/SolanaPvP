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

        // Create match
        var match = new Match
        {
            MatchPda = parsedEvent.MatchPda,
            GameMode = matchData.GameMode,
            MatchType = matchData.MatchType,
            StakeLamports = matchData.StakeLamports,
            Status = MatchStatus.Waiting,
            DeadlineTs = matchData.DeadlineTs,
            CreateTx = signature,
            CreatedAt = DateTime.UtcNow
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

        // Create or update user
        var user = new User
        {
            Pubkey = matchData.Creator,
            FirstSeen = DateTime.UtcNow,
            LastSeen = DateTime.UtcNow
        };
        await userRepository.CreateOrUpdateAsync(user);
        _logger.LogDebug("[ProcessMatchCreated] User created/updated: {Creator}", matchData.Creator);

        // Schedule refund task
        await refundScheduler.ScheduleAsync(parsedEvent.MatchPda, matchData.DeadlineTs);
        _logger.LogDebug("[ProcessMatchCreated] Refund task scheduled for {MatchPda}", parsedEvent.MatchPda);

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
        var joinData = ParseMatchJoinedPayload(parsedEvent.PayloadJson);
        if (joinData == null) return;

        // Get existing match
        var match = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (match == null) return;

        // Update match status
        match.Status = MatchStatus.AwaitingRandomness;
        match.JoinedAt = DateTime.UtcNow;
        match.JoinTx = signature;
        await matchRepository.UpdateAsync(match);

        // Create joiner participant
        var joinerParticipant = new MatchParticipant
        {
            MatchPda = parsedEvent.MatchPda,
            Pubkey = joinData.Player,
            Side = 1,
            Position = 0
        };

        // Create or update user
        var user = new User
        {
            Pubkey = joinData.Player,
            FirstSeen = DateTime.UtcNow,
            LastSeen = DateTime.UtcNow
        };
        await userRepository.CreateOrUpdateAsync(user);

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
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var gameDataGenerator = serviceProvider.GetRequiredService<IGameDataGenerator>();
        var matchService = serviceProvider.GetRequiredService<IMatchService>();

        // Parse resolution data
        var resolutionData = ParseMatchResolvedPayload(parsedEvent.PayloadJson);
        if (resolutionData == null) return;

        // Get existing match
        var match = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (match == null) return;

        // Generate game data
        var gameData = await gameDataGenerator.GenerateGameDataAsync(match, resolutionData.Winner);
        
        // Update match
        match.Status = MatchStatus.Resolved;
        match.WinnerSide = DetermineWinnerSide(match, resolutionData.Winner);
        match.ResolvedAt = DateTime.UtcNow;
        match.PayoutTx = signature;
        match.GameData = gameData;
        await matchRepository.UpdateAsync(match);

        // Update user stats
        foreach (var participant in match.Participants)
        {
            var isWinner = participant.Pubkey == resolutionData.Winner;
            var earnings = isWinner ? match.StakeLamports * 2 : 0; // Winner gets 2x stake
            await userRepository.UpdateStatsAsync(participant.Pubkey, isWinner, earnings);
        }

        _logger.LogInformation("Match resolved: {MatchPda}, Winner: {Winner}", parsedEvent.MatchPda, resolutionData.Winner);

        // Broadcast to all clients via SignalR
        var matchDetails = await matchService.GetMatchAsync(parsedEvent.MatchPda);
        if (matchDetails != null)
        {
            await _hubContext.NotifyMatchResolved(parsedEvent.MatchPda, matchDetails);
            _logger.LogDebug("[ProcessMatchResolved] Broadcasted match resolved to clients");
        }
    }

    private async Task ProcessMatchRefundedAsync(ParsedEvent parsedEvent, string signature, IServiceProvider serviceProvider)
    {
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();
        var matchService = serviceProvider.GetRequiredService<IMatchService>();

        // Parse refund data
        var refundData = ParseMatchRefundedPayload(parsedEvent.PayloadJson);
        if (refundData == null) return;

        // Get existing match
        var match = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (match == null) return;

        // Update match
        match.Status = MatchStatus.Refunded;
        match.PayoutTx = signature;
        await matchRepository.UpdateAsync(match);

        // Mark refund task as executed
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

    private int DetermineWinnerSide(Match match, string winnerPubkey)
    {
        var winnerParticipant = match.Participants.FirstOrDefault(p => p.Pubkey == winnerPubkey);
        return winnerParticipant?.Side ?? 0;
    }

    // Placeholder methods for parsing payloads - these would need to be implemented based on your actual Anchor event structure
    private MatchCreatedData? ParseMatchCreatedPayload(string payloadJson) => new MatchCreatedData();
    private MatchJoinedData? ParseMatchJoinedPayload(string payloadJson) => new MatchJoinedData();
    private MatchResolvedData? ParseMatchResolvedPayload(string payloadJson) => new MatchResolvedData();
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
}

public class MatchResolvedData
{
    public string Winner { get; set; } = string.Empty;
}

public class MatchRefundedData
{
    public string RefundTx { get; set; } = string.Empty;
}
