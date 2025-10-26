using Microsoft.EntityFrameworkCore;
using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.Context;
using SolanaPvP.EF_Core.DBOs;
using SolanaPvP.EF_Core.Mappers;

namespace SolanaPvP.EF_Core.Repositories;

public class RefundTaskRepository : IRefundTaskRepository
{
    private readonly SolanaPvPDbContext _context;

    public RefundTaskRepository(SolanaPvPDbContext context)
    {
        _context = context;
    }

    public async Task<RefundTask> CreateAsync(RefundTask task)
    {
        var dbo = new RefundTaskDBO
        {
            MatchPda = task.MatchPda,
            DeadlineTs = task.DeadlineTs,
            ScheduledAt = task.ScheduledAt,
            CanceledAt = task.CanceledAt,
            ExecutedTx = task.ExecutedTx
        };

        _context.RefundTasks.Add(dbo);
        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<RefundTask?> GetByMatchPdaAsync(string matchPda)
    {
        var dbo = await _context.RefundTasks.FindAsync(matchPda);
        if (dbo == null) return null;

        return new RefundTask
        {
            MatchPda = dbo.MatchPda,
            DeadlineTs = dbo.DeadlineTs,
            ScheduledAt = dbo.ScheduledAt,
            CanceledAt = dbo.CanceledAt,
            ExecutedTx = dbo.ExecutedTx
        };
    }

    public async Task<RefundTask> UpdateAsync(RefundTask task)
    {
        var dbo = await _context.RefundTasks.FindAsync(task.MatchPda);
        if (dbo == null) throw new InvalidOperationException($"RefundTask not found: {task.MatchPda}");

        dbo.DeadlineTs = task.DeadlineTs;
        dbo.ScheduledAt = task.ScheduledAt;
        dbo.CanceledAt = task.CanceledAt;
        dbo.ExecutedTx = task.ExecutedTx;

        _context.RefundTasks.Update(dbo);
        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<IEnumerable<RefundTask>> GetPendingTasksAsync(long currentTimestamp, int batchSize)
    {
        var dbos = await _context.RefundTasks
            .Where(rt => rt.DeadlineTs <= currentTimestamp && rt.CanceledAt == null && rt.ExecutedTx == null)
            .Take(batchSize)
            .ToListAsync();

        return dbos.Select(dbo => new RefundTask
        {
            MatchPda = dbo.MatchPda,
            DeadlineTs = dbo.DeadlineTs,
            ScheduledAt = dbo.ScheduledAt,
            CanceledAt = dbo.CanceledAt,
            ExecutedTx = dbo.ExecutedTx
        });
    }

    public async Task CancelTaskAsync(string matchPda)
    {
        var dbo = await _context.RefundTasks.FindAsync(matchPda);
        if (dbo == null) return;

        dbo.CanceledAt = DateTime.UtcNow;
        _context.RefundTasks.Update(dbo);
        await _context.SaveChangesAsync();
    }
}
