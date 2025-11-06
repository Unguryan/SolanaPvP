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
                    _logger.LogInformation("[GameTimeoutWorker] Updating stats for {Count} participants...", match.Participants.Count);
                    
                    foreach (var participant in match.Participants)
                    {
                        var isWinner = participant.Side == match.WinnerSide;
                        // Calculate earnings: winner gets 2x stake minus 1% fee
                        // Total pot = stake * teamSize * 2
                        // Winner gets: (pot * 0.99) / teamSize
                        var totalParticipants = match.Participants.Count;
                        var totalPot = match.StakeLamports * totalParticipants;
                        var potAfterFee = (long)(totalPot * 0.99);
                        var winnersCount = match.Participants.Count(p => p.Side == match.WinnerSide);
                        var earnings = isWinner ? potAfterFee / winnersCount : 0;
                        
                        _logger.LogInformation("[GameTimeoutWorker] Player {Pubkey}: Winner={IsWinner}, Earnings={Earnings}", 
                            participant.Pubkey, isWinner, earnings);
                        
                        await userRepository.UpdateStatsAsync(participant.Pubkey, isWinner, earnings);
                    }

                    _logger.LogInformation("[GameTimeoutWorker] ✅ Match {MatchPda} finalized, winner side: {WinnerSide}", 
                        match.MatchPda, match.WinnerSide);

                    // Broadcast to clients
                    var matchDetails = await matchService.GetMatchAsync(match.MatchPda);
                    if (matchDetails != null)
                    {
                        await hubContext.NotifyMatchFinalized(match.MatchPda, matchDetails);
                        
                        // Broadcast feed event for ticker/feeds
                        await hubContext.Clients.All.SendAsync("feed:append", new {
                            matchPda = match.MatchPda,
                            winnerSide = match.WinnerSide,
                            stakeLamports = match.StakeLamports,
                            gameType = match.GameType, // Already string
                            gameMode = match.GameMode, // Already string
                            matchMode = match.MatchMode, // Already string
                            teamSize = match.TeamSize, // Already string
                            resolvedAt = match.ResolvedAt?.ToString("O"), // ISO 8601 UTC format
                            participants = match.Participants.Select(p => new {
                                pubkey = p.Pubkey,
                                username = p.User?.Username,
                                side = p.Side,
                                targetScore = p.TargetScore,
                                isWinner = p.IsWinner
                            })
                        });
                        
                        _logger.LogInformation("[GameTimeoutWorker] Feed event broadcast for match {MatchPda}", match.MatchPda);
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

