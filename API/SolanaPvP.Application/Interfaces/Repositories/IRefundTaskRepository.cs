using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Repositories;

public interface IRefundTaskRepository
{
    Task<RefundTask> CreateAsync(RefundTask task);
    Task<RefundTask?> GetByMatchPdaAsync(string matchPda);
    Task<RefundTask> UpdateAsync(RefundTask task);
    Task<IEnumerable<RefundTask>> GetPendingTasksAsync(long currentTimestamp, int batchSize);
    Task CancelTaskAsync(string matchPda);
}
