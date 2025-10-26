using SolanaPvP.Domain.Enums;

namespace SolanaPvP.Domain.Models;

public class Event
{
    public int Id { get; set; }
    public string Signature { get; set; } = string.Empty;
    public long Slot { get; set; }
    public EventKind Kind { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTime Ts { get; set; }

    // Navigation properties
    public Match Match { get; set; } = null!;
}
