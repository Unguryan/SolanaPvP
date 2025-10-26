using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Services;

public interface IRefundScheduler
{
    Task ScheduleAsync(string matchPda, long deadlineTs);
    Task CancelAsync(string matchPda);
    Task<IEnumerable<RefundTask>> GetPendingTasksAsync(int batchSize);
    Task MarkAsExecutedAsync(string matchPda, string executedTx);
}
