using SolanaPvP.Domain.Enums;

namespace SolanaPvP.SolanaRPC.Internal.Models;

public class ParsedEvent
{
    public EventKind Kind { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
}
