using Microsoft.EntityFrameworkCore;
using SolanaPvP.Domain.Enums;

namespace SolanaPvP.EF_Core.DBOs;

[PrimaryKey(nameof(Id))]
public class EventDBO
{
    public int Id { get; set; }
    public string Signature { get; set; } = string.Empty;
    public long Slot { get; set; }
    public EventKind Kind { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTime Ts { get; set; }

    // Navigation properties
    public MatchDBO Match { get; set; } = null!;
}
