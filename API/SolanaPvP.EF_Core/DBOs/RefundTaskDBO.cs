using Microsoft.EntityFrameworkCore;

namespace SolanaPvP.EF_Core.DBOs;

[PrimaryKey(nameof(MatchPda))]
public class RefundTaskDBO
{
    public string MatchPda { get; set; } = string.Empty;
    public long DeadlineTs { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? CanceledAt { get; set; }
    public string? ExecutedTx { get; set; }
}
