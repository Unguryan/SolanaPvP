namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface IRefundSender
{
    Task<string> SendRefundAsync(string matchPda);
}
