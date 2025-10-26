namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface IWsSubscriber
{
    Task SubscribeLogsAsync(string programId, Action<WsLogEvent> onEvent, CancellationToken cancellationToken);
    Task DisconnectAsync();
    bool IsConnected { get; }
}

public class WsLogEvent
{
    public string Signature { get; set; } = string.Empty;
    public long Slot { get; set; }
    public List<string> Logs { get; set; } = new();
    public string? Error { get; set; }
}
