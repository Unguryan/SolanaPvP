using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Models;

namespace SolanaPvP.Infrastructure.Services;

public class RefundScheduler : IRefundScheduler
{
    private readonly IRefundTaskRepository _refundTaskRepository;

    public RefundScheduler(IRefundTaskRepository refundTaskRepository)
    {
        _refundTaskRepository = refundTaskRepository;
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
    }
}
