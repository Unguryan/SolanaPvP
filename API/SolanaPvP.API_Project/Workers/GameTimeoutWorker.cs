using Microsoft.AspNetCore.SignalR;
using SolanaPvP.API_Project.Hubs;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Enums;

namespace SolanaPvP.API_Project.Workers;

public class GameTimeoutWorker : BackgroundService
{
    private readonly ILogger<GameTimeoutWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private const int CHECK_PERIOD_SECONDS = 5;

    public GameTimeoutWorker(
        ILogger<GameTimeoutWorker> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[GameTimeoutWorker] Started - monitoring InProgress matches");
        
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessInProgressMatchesAsync();
                await Task.Delay(TimeSpan.FromSeconds(CHECK_PERIOD_SECONDS), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[GameTimeoutWorker] Error in worker loop");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }
    }

    private async Task ProcessInProgressMatchesAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var matchRepository = scope.ServiceProvider.GetRequiredService<IMatchRepository>();
        var matchService = scope.ServiceProvider.GetRequiredService<IMatchService>();
        var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<MatchHub>>();

        // Get matches in InProgress status
        var inProgressMatches = await matchRepository.GetMatchesAsync(
            status: (int)MatchStatus.InProgress,
            skip: 0,
            take: 50
        );

        foreach (var match in inProgressMatches)
        {
            try
            {
                if (!match.GameStartTime.HasValue)
                {
                    _logger.LogWarning("[GameTimeoutWorker] Match {MatchPda} in InProgress but no GameStartTime", match.MatchPda);
                    continue;
                }

                var gameEndTime = match.GameStartTime.Value.AddSeconds(20);
                
                if (DateTime.UtcNow >= gameEndTime)
                {
                    _logger.LogInformation("[GameTimeoutWorker] ⏱️ Match {MatchPda} game timeout reached, finalizing...", match.MatchPda);

                    // Move to Resolved
                    match.Status = MatchStatus.Resolved;
                    match.ResolvedAt = DateTime.UtcNow;
                    await matchRepository.UpdateAsync(match);

                    // Update user stats
                    foreach (var participant in match.Participants)
                    {
                        var isWinner = participant.Side == match.WinnerSide;
                        var earnings = isWinner ? match.StakeLamports * 2 : 0;
                        await userRepository.UpdateStatsAsync(participant.Pubkey, isWinner, earnings);
                    }

                    _logger.LogInformation("[GameTimeoutWorker] ✅ Match {MatchPda} finalized, winner side: {WinnerSide}", 
                        match.MatchPda, match.WinnerSide);

                    // Broadcast to clients
                    var matchDetails = await matchService.GetMatchAsync(match.MatchPda);
                    if (matchDetails != null)
                    {
                        await hubContext.NotifyMatchFinalized(match.MatchPda, matchDetails);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[GameTimeoutWorker] Failed to process match {MatchPda}", match.MatchPda);
            }
        }
    }
}

