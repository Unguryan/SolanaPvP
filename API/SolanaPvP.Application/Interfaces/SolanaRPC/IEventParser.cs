using SolanaPvP.Domain.Enums;

namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface IEventParser
{
    bool IsOurProgram(string programId);
    ParsedEvent? ParseProgramLog(string logLine);
}

public class ParsedEvent
{
    public EventKind Kind { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
}
