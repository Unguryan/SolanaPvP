using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Models;
using SolanaPvP.Domain.Enums;

namespace SolanaPvP.Infrastructure.Services;

public class RefundScheduler : IRefundScheduler
{
    private readonly IRefundTaskRepository _refundTaskRepository;
    private readonly IMatchRepository _matchRepository;

    public RefundScheduler(IRefundTaskRepository refundTaskRepository, IMatchRepository matchRepository)
    {
        _refundTaskRepository = refundTaskRepository;
        _matchRepository = matchRepository;
    }

    public async Task ScheduleAsync(string matchPda, long deadlineTs)
    {
        var task = new RefundTask
        {
            MatchPda = matchPda,
            DeadlineTs = deadlineTs,
            ScheduledAt = DateTime.UtcNow
        };

        await _refundTaskRepository.CreateAsync(task);
    }

    public async Task CancelAsync(string matchPda)
    {
        await _refundTaskRepository.CancelTaskAsync(matchPda);
    }

    public async Task<IEnumerable<RefundTask>> GetPendingTasksAsync(int batchSize)
    {
        var currentTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return await _refundTaskRepository.GetPendingTasksAsync(currentTimestamp, batchSize);
    }

    public async Task MarkAsExecutedAsync(string matchPda, string executedTx)
    {
        var task = await _refundTaskRepository.GetByMatchPdaAsync(matchPda);
        if (task == null) return;

        task.ExecutedTx = executedTx;
        await _refundTaskRepository.UpdateAsync(task);

        // Also update the match status to Refunded
        var match = await _matchRepository.GetByMatchPdaAsync(matchPda);
        if (match != null && match.Status != MatchStatus.Refunded)
        {
            match.Status = MatchStatus.Refunded;
            match.PayoutTx = executedTx;
            await _matchRepository.UpdateAsync(match);
        }
    }
}
