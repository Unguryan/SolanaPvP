namespace SolanaPvP.SolanaRPC.Internal.Models;

public class WsLogEvent
{
    public string Signature { get; set; } = string.Empty;
    public long Slot { get; set; }
    public List<string> Logs { get; set; } = new();
    public string? Error { get; set; }
}
