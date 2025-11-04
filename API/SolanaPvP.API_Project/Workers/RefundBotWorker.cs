using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;
using SolanaPvP.Domain.Settings;

namespace SolanaPvP.API_Project.Workers;

public class RefundBotWorker : BackgroundService
{
    private readonly ILogger<RefundBotWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly RefundSettings _refundSettings;

    public RefundBotWorker(
        ILogger<RefundBotWorker> logger,
        IServiceProvider serviceProvider,
        RefundSettings refundSettings)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _refundSettings = refundSettings;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RefundBotWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessRefundTasksAsync();
                await Task.Delay(TimeSpan.FromSeconds(_refundSettings.CheckPeriodSeconds), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RefundBotWorker");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // Wait 30 seconds before retrying
            }
        }
    }

    private async Task ProcessRefundTasksAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var refundScheduler = scope.ServiceProvider.GetRequiredService<IRefundScheduler>();
        var matchRepository = scope.ServiceProvider.GetRequiredService<IMatchRepository>();
        var refundSender = scope.ServiceProvider.GetRequiredService<SolanaPvP.Application.Interfaces.SolanaRPC.IRefundSender>();

        // Get pending refund tasks
        var pendingTasks = await refundScheduler.GetPendingTasksAsync(_refundSettings.BatchSize);

        foreach (var task in pendingTasks)
        {
            try
            {
                // Check if match is still in waiting status
                var match = await matchRepository.GetByMatchPdaAsync(task.MatchPda);
                if (match == null)
                {
                    // Match no longer exists, cancel the task
                    await refundScheduler.CancelAsync(task.MatchPda);
                    continue;
                }
                
                // Only cancel refund if match is resolved (finished), not if it's just joined
                if (match.Status == MatchStatus.Resolved || match.Status == MatchStatus.Refunded)
                {
                    // Match already finished, cancel the refund task
                    await refundScheduler.CancelAsync(task.MatchPda);
                    continue;
                }
                
                // If match is still open (waiting for players), proceed with refund check
                if (match.Status != MatchStatus.Open)
                {
                    // Match has players but not yet resolved - skip refund for now
                    continue;
                }

                // Execute refund
                var refundTx = await refundSender.SendRefundAsync(task.MatchPda);
                
                _logger.LogInformation("Refund transaction sent for match {MatchPda}: {RefundTx}", task.MatchPda, refundTx);
                
                // Mark task as executed
                await refundScheduler.MarkAsExecutedAsync(task.MatchPda, refundTx);

                _logger.LogInformation("Refund executed for match {MatchPda}, tx: {RefundTx}", task.MatchPda, refundTx);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process refund task for match {MatchPda}", task.MatchPda);
            }
        }
    }
}
