using Microsoft.AspNetCore.SignalR;
using SolanaPvP.API_Project.Hubs;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;
using SolanaPvP.Domain.Settings;

namespace SolanaPvP.API_Project.Workers;

public class IndexerWorker : BackgroundService
{
    private readonly ILogger<IndexerWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly SolanaSettings _solanaSettings;
    private readonly IndexerSettings _indexerSettings;
    private readonly IWsSubscriber _wsSubscriber;
    private readonly IHubContext<MatchHub> _hubContext;

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

        try
        {
            // Start WebSocket subscription
            await _wsSubscriber.SubscribeLogsAsync(_solanaSettings.ProgramId, OnLogEvent, stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "IndexerWorker failed to start");
        }
    }

    private async void OnLogEvent(WsLogEvent logEvent)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var eventParser = scope.ServiceProvider.GetRequiredService<IEventParser>();
            var eventRepository = scope.ServiceProvider.GetRequiredService<IEventRepository>();
            var matchRepository = scope.ServiceProvider.GetRequiredService<IMatchRepository>();
            var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var refundScheduler = scope.ServiceProvider.GetRequiredService<IRefundScheduler>();
            var gameDataGenerator = scope.ServiceProvider.GetRequiredService<IGameDataGenerator>();
            var indexerStateManager = scope.ServiceProvider.GetRequiredService<IIndexerStateManager>();

            // Check if we've already processed this event
            if (await eventRepository.ExistsBySignatureAsync(logEvent.Signature))
            {
                return;
            }

            // Parse logs for our program events
            foreach (var logLine in logEvent.Logs)
            {
                var parsedEvent = eventParser.ParseProgramLog(logLine);
                if (parsedEvent == null) continue;

                await ProcessEventAsync(parsedEvent, logEvent, scope.ServiceProvider);
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
        var eventRepository = serviceProvider.GetRequiredService<IEventRepository>();
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();
        var gameDataGenerator = serviceProvider.GetRequiredService<IGameDataGenerator>();

        // Create event record
        var eventEntity = new Event
        {
            Signature = logEvent.Signature,
            Slot = logEvent.Slot,
            Kind = parsedEvent.Kind,
            MatchPda = parsedEvent.MatchPda,
            PayloadJson = parsedEvent.PayloadJson,
            Ts = DateTime.UtcNow
        };

        await eventRepository.CreateAsync(eventEntity);

        // Process based on event type
        switch (parsedEvent.Kind)
        {
            case EventKind.MatchCreated:
                await ProcessMatchCreatedAsync(parsedEvent, serviceProvider);
                break;
            case EventKind.MatchJoined:
                await ProcessMatchJoinedAsync(parsedEvent, serviceProvider);
                break;
            case EventKind.MatchResolved:
                await ProcessMatchResolvedAsync(parsedEvent, serviceProvider);
                break;
            case EventKind.MatchRefunded:
                await ProcessMatchRefundedAsync(parsedEvent, serviceProvider);
                break;
        }
    }

    private async Task ProcessMatchCreatedAsync(ParsedEvent parsedEvent, IServiceProvider serviceProvider)
    {
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();

        // Parse match creation data from payload
        var matchData = ParseMatchCreatedPayload(parsedEvent.PayloadJson);
        if (matchData == null) return;

        // Create match
        var match = new Match
        {
            MatchPda = parsedEvent.MatchPda,
            GameMode = matchData.GameMode,
            MatchType = matchData.MatchType,
            StakeLamports = matchData.StakeLamports,
            Status = MatchStatus.Waiting,
            DeadlineTs = matchData.DeadlineTs,
            CreateTx = parsedEvent.PayloadJson, // Store full payload for now
            CreatedAt = DateTime.UtcNow
        };

        await matchRepository.CreateAsync(match);

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

        // Schedule refund task
        await refundScheduler.ScheduleAsync(parsedEvent.MatchPda, matchData.DeadlineTs);

        _logger.LogInformation("Match created: {MatchPda}", parsedEvent.MatchPda);
    }

    private async Task ProcessMatchJoinedAsync(ParsedEvent parsedEvent, IServiceProvider serviceProvider)
    {
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();

        // Parse join data
        var joinData = ParseMatchJoinedPayload(parsedEvent.PayloadJson);
        if (joinData == null) return;

        // Get existing match
        var match = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (match == null) return;

        // Update match status
        match.Status = MatchStatus.AwaitingRandomness;
        match.JoinedAt = DateTime.UtcNow;
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
    }

    private async Task ProcessMatchResolvedAsync(ParsedEvent parsedEvent, IServiceProvider serviceProvider)
    {
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var gameDataGenerator = serviceProvider.GetRequiredService<IGameDataGenerator>();

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
    }

    private async Task ProcessMatchRefundedAsync(ParsedEvent parsedEvent, IServiceProvider serviceProvider)
    {
        var matchRepository = serviceProvider.GetRequiredService<IMatchRepository>();
        var refundScheduler = serviceProvider.GetRequiredService<IRefundScheduler>();

        // Parse refund data
        var refundData = ParseMatchRefundedPayload(parsedEvent.PayloadJson);
        if (refundData == null) return;

        // Get existing match
        var match = await matchRepository.GetByMatchPdaAsync(parsedEvent.MatchPda);
        if (match == null) return;

        // Update match
        match.Status = MatchStatus.Refunded;
        match.PayoutTx = refundData.RefundTx;
        await matchRepository.UpdateAsync(match);

        // Mark refund task as executed
        await refundScheduler.MarkAsExecutedAsync(parsedEvent.MatchPda, refundData.RefundTx);

        _logger.LogInformation("Match refunded: {MatchPda}", parsedEvent.MatchPda);
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
    public MatchType MatchType { get; set; }
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
