namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface IRefundSender
{
    Task<string> SendRefundAsync(string matchPda);
    
    /// <summary>
    /// Send refund transaction with manual parameters (bypasses DB)
    /// </summary>
    Task<string> SendRefundUnsafeAsync(string lobbyPda, string creator, List<string> participants);
}
