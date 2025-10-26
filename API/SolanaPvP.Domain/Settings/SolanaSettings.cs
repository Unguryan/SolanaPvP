namespace SolanaPvP.Domain.Settings;

public class SolanaSettings
{
    public string ProgramId { get; set; } = string.Empty;
    public string RpcPrimaryUrl { get; set; } = string.Empty;
    public string RpcFallbackUrl { get; set; } = string.Empty;
    public string WsUrl { get; set; } = string.Empty;
    public string TreasuryPubkey { get; set; } = string.Empty;
    public string RefundBotKeypairPath { get; set; } = string.Empty;
}
