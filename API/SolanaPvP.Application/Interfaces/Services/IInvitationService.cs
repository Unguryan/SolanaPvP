using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Services;

public interface IInvitationService
{
    Task<MatchInvitation> CreateInvitationAsync(CreateInvitationRequest request);
    Task<MatchInvitation?> GetInvitationAsync(int invitationId);
    Task<IEnumerable<MatchInvitation>> GetUserInvitationsAsync(string pubkey, InvitationStatus? status = null);
    Task<MatchInvitation> AcceptInvitationAsync(int invitationId, string inviteePubkey);
    Task<MatchInvitation> DeclineInvitationAsync(int invitationId, string inviteePubkey);
    Task<MatchInvitation> CancelInvitationAsync(int invitationId, string inviterPubkey);
    Task CleanupExpiredInvitationsAsync();
}

public class CreateInvitationRequest
{
    public string InviterPubkey { get; set; } = string.Empty; // Will be set by controller from headers
    public string InviteePubkey { get; set; } = string.Empty;
    public GameModeType GameMode { get; set; }
    public MatchType MatchType { get; set; }
    public long StakeLamports { get; set; }
    public int ExpirationMinutes { get; set; } = 30; // Default 30 minutes
}
