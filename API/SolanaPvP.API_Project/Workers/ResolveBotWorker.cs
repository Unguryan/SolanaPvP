using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Enums;

namespace SolanaPvP.API_Project.Workers;

public class ResolveBotWorker : BackgroundService
{
    private readonly ILogger<ResolveBotWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private const int CHECK_PERIOD_SECONDS = 5; // Check every 5 seconds

    public ResolveBotWorker(
        ILogger<ResolveBotWorker> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[ResolveBotWorker] Started - monitoring for fulfilled Orao VRF requests");

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
                _logger.LogError(ex, "[ResolveBotWorker] Error in worker loop");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // Wait 30 seconds before retrying
            }
        }
    }

    private async Task ProcessPendingMatchesAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var matchRepository = scope.ServiceProvider.GetRequiredService<IMatchRepository>();
        var resolveSender = scope.ServiceProvider.GetRequiredService<IResolveSender>();

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
                _logger.LogInformation("[ResolveBotWorker] 🎲 Processing match {MatchPda}", match.MatchPda);

                // Get randomness account from match (saved during PlayerJoined event - Orao VRF request PDA)
                var vrfRequest = match.RandomnessAccount;
                
                if (string.IsNullOrWhiteSpace(vrfRequest))
                {
                    _logger.LogWarning("[ResolveBotWorker] ⚠️ Match {MatchPda} has no VRF request account, skipping", match.MatchPda);
                    continue;
                }

                _logger.LogInformation("[ResolveBotWorker] Attempting resolve for match {MatchPda} with VRF request {VrfRequest}", 
                    match.MatchPda, vrfRequest);

                // Send resolve transaction
                // Orao oracles fulfill automatically (sub-second), so we just try to resolve
                // If randomness isn't fulfilled yet, transaction will fail with "RandomnessNotFulfilled" and we'll retry
                var signature = await resolveSender.SendResolveMatchAsync(match.MatchPda, vrfRequest);

                if (!string.IsNullOrEmpty(signature))
                {
                    _logger.LogInformation("[ResolveBotWorker] ✅ Successfully resolved match {MatchPda}, signature: {Signature}", 
                        match.MatchPda, signature);
                }
                else
                {
                    _logger.LogInformation("[ResolveBotWorker] ⏳ Match {MatchPda} randomness not yet fulfilled, will retry", match.MatchPda);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ResolveBotWorker] ❌ Failed to process match {MatchPda}", match.MatchPda);
            }
        }
    }
}
