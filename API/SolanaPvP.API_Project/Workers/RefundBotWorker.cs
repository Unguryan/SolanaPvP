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
        var refundSender = scope.ServiceProvider.GetRequiredService<IRefundSender>();

        // Get pending refund tasks
        var pendingTasks = await refundScheduler.GetPendingTasksAsync(_refundSettings.BatchSize);

        foreach (var task in pendingTasks)
        {
            try
            {
                // Check if match is still in waiting status
                var match = await matchRepository.GetByMatchPdaAsync(task.MatchPda);
                if (match == null || match.Status != MatchStatus.Waiting)
                {
                    // Match no longer exists or has been joined, cancel the task
                    await refundScheduler.CancelAsync(task.MatchPda);
                    continue;
                }

                // Execute refund
                var refundTx = await refundSender.SendRefundAsync(task.MatchPda);
                
                // Mark task as executed
                await refundScheduler.MarkAsExecutedAsync(task.MatchPda, refundTx);

                // Update match status
                match.Status = MatchStatus.Refunded;
                match.PayoutTx = refundTx;
                await matchRepository.UpdateAsync(match);

                _logger.LogInformation("Refund executed for match {MatchPda}, tx: {RefundTx}", task.MatchPda, refundTx);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process refund task for match {MatchPda}", task.MatchPda);
            }
        }
    }
}
