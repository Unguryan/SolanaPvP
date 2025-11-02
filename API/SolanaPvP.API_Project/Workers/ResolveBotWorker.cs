using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Enums;
using Microsoft.Extensions.Options;
using SolanaPvP.Domain.Settings;

namespace SolanaPvP.API_Project.Workers;

public class ResolveBotWorker : BackgroundService
{
    private readonly ILogger<ResolveBotWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly SwitchboardSettings _switchboardSettings;
    private const int CHECK_PERIOD_SECONDS = 5; // Check every 5 seconds
    private readonly HashSet<string> _commitedRandomness = new(); // Track committed randomness accounts

    public ResolveBotWorker(
        ILogger<ResolveBotWorker> logger,
        IServiceProvider serviceProvider,
        IOptions<SwitchboardSettings> switchboardSettings)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _switchboardSettings = switchboardSettings.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ResolveBotWorker started");

        // Wait 10 seconds before starting to allow other services to initialize
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingMatchesAsync();
                await Task.Delay(TimeSpan.FromSeconds(CHECK_PERIOD_SECONDS), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ResolveBotWorker");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // Wait 30 seconds before retrying
            }
        }
    }

    private async Task ProcessPendingMatchesAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var matchRepository = scope.ServiceProvider.GetRequiredService<IMatchRepository>();
        var resolveSender = scope.ServiceProvider.GetRequiredService<IResolveSender>();
        var switchboardClient = scope.ServiceProvider.GetRequiredService<ISwitchboardClient>();
        var switchboardApi = scope.ServiceProvider.GetRequiredService<ISwitchboardApiClient>();
        var poolService = scope.ServiceProvider.GetRequiredService<IRandomnessPoolService>();

        // Get matches with AwaitingRandomness status
        var pendingMatches = await matchRepository.GetMatchesAsync(
            status: (int)MatchStatus.AwaitingRandomness, 
            skip: 0, 
            take: 10
        );

        foreach (var match in pendingMatches)
        {
            try
            {
                _logger.LogInformation("[ResolveBotWorker] Processing match {MatchPda} for resolution", match.MatchPda);

                // Get randomness account from match (saved during PlayerJoined event)
                var randomnessAccount = match.RandomnessAccount;
                
                if (string.IsNullOrWhiteSpace(randomnessAccount))
                {
                    _logger.LogWarning("[ResolveBotWorker] Match {MatchPda} has no randomness account, skipping", match.MatchPda);
                    continue;
                }

                // Commit randomness if not already committed
                if (!_commitedRandomness.Contains(randomnessAccount))
                {
                    _logger.LogInformation("[ResolveBotWorker] Committing randomness for account {Account}", randomnessAccount);
                    var committed = await switchboardApi.CommitRandomnessAsync(randomnessAccount);
                    
                    if (committed)
                    {
                        _commitedRandomness.Add(randomnessAccount);
                        _logger.LogInformation("[ResolveBotWorker] Randomness committed for {Account}", randomnessAccount);
                    }
                    else
                    {
                        _logger.LogWarning("[ResolveBotWorker] Failed to commit randomness for {Account}, will retry", randomnessAccount);
                        continue;
                    }
                }

                // Check if randomness is ready from Switchboard
                var isReady = await switchboardClient.IsRandomnessReadyAsync(randomnessAccount);
                
                if (!isReady)
                {
                    _logger.LogDebug("[ResolveBotWorker] Randomness not ready yet for match {MatchPda}, will retry later", match.MatchPda);
                    continue;
                }

                _logger.LogInformation("[ResolveBotWorker] Randomness ready, sending resolve transaction for match {MatchPda}", match.MatchPda);

                // Send resolve_match transaction
                var resolveTx = await resolveSender.SendResolveMatchAsync(match.MatchPda, randomnessAccount);
                
                _logger.LogInformation("[ResolveBotWorker] ✅ Resolve transaction sent for match {MatchPda}: {TxSignature}", 
                    match.MatchPda, resolveTx);
                
                // Return randomness account to pool with cooldown
                await poolService.ReturnAccountAsync(randomnessAccount, _switchboardSettings.CooldownMinutes);
                _logger.LogInformation("[ResolveBotWorker] Randomness account {Account} returned to pool", randomnessAccount);
                
                // Note: Match status will be updated by IndexerWorker when it receives the LobbyResolved event
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ResolveBotWorker] Failed to process match {MatchPda}", match.MatchPda);
                // Continue with next match
            }
        }

        if (pendingMatches.Any())
        {
            _logger.LogDebug("[ResolveBotWorker] Processed {Count} pending matches", pendingMatches.Count());
        }
    }
}

