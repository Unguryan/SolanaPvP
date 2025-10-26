namespace SolanaPvP.Domain.Models;

public class RefundTask
{
    public string MatchPda { get; set; } = string.Empty;
    public long DeadlineTs { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? CanceledAt { get; set; }
    public string? ExecutedTx { get; set; }
}
