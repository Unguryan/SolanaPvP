using Microsoft.Extensions.Logging;
using SolanaPvP.Application.Interfaces.SolanaRPC;

namespace SolanaPvP.SolanaRPC.Services;

/// <summary>
/// Helper for manually triggering refunds (testing/admin purposes)
/// </summary>
public class ManualRefundHelper
{
    private readonly IRefundSender _refundSender;
    private readonly ILogger<ManualRefundHelper> _logger;

    public ManualRefundHelper(IRefundSender refundSender, ILogger<ManualRefundHelper> logger)
    {
        _refundSender = refundSender;
        _logger = logger;
    }

    /// <summary>
    /// Manually trigger refund for a specific lobby (from DB)
    /// </summary>
    public async Task<string> RefundLobbyAsync(string lobbyPda)
    {
        try
        {
            _logger.LogInformation("[ManualRefund] Manually triggering refund for lobby {LobbyPda}", lobbyPda);
            
            var signature = await _refundSender.SendRefundAsync(lobbyPda);
            
            _logger.LogInformation("[ManualRefund] ✅ Refund sent successfully. Signature: {Signature}", signature);
            
            return signature;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ManualRefund] Failed to refund lobby {LobbyPda}", lobbyPda);
            throw;
        }
    }

    /// <summary>
    /// Manually trigger refund with explicit parameters (bypasses DB)
    /// Use this for lobbies not in DB or for testing
    /// </summary>
    public async Task<string> RefundLobbyUnsafeAsync(string lobbyPda, string creator, List<string> participants)
    {
        try
        {
            _logger.LogWarning("[ManualRefund] UNSAFE: Manually triggering refund for lobby {LobbyPda} with explicit params", lobbyPda);
            _logger.LogInformation("[ManualRefund] Creator: {Creator}, Participants: {Count}", creator, participants.Count);
            
            var signature = await _refundSender.SendRefundUnsafeAsync(lobbyPda, creator, participants);
            
            _logger.LogInformation("[ManualRefund] ✅ UNSAFE refund sent successfully. Signature: {Signature}", signature);
            
            return signature;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ManualRefund] Failed to refund lobby {LobbyPda} (unsafe mode)", lobbyPda);
            throw;
        }
    }
}

