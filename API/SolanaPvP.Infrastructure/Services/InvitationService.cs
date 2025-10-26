using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;

namespace SolanaPvP.Infrastructure.Services;

public class InvitationService : IInvitationService
{
    private readonly IMatchInvitationRepository _invitationRepository;
    private readonly IUserRepository _userRepository;

    public InvitationService(IMatchInvitationRepository invitationRepository, IUserRepository userRepository)
    {
        _invitationRepository = invitationRepository;
        _userRepository = userRepository;
    }

    public async Task<MatchInvitation> CreateInvitationAsync(CreateInvitationRequest request)
    {
        // Validate that both users exist
        var inviter = await _userRepository.GetByPubkeyAsync(request.InviterPubkey);
        var invitee = await _userRepository.GetByPubkeyAsync(request.InviteePubkey);

        if (inviter == null || invitee == null)
        {
            throw new ArgumentException("Both inviter and invitee must exist");
        }

        if (request.InviterPubkey == request.InviteePubkey)
        {
            throw new ArgumentException("Cannot invite yourself");
        }

        // Check for existing pending invitation
        var existingInvitations = await _invitationRepository.GetUserInvitationsAsync(request.InviterPubkey, (int)InvitationStatus.Pending);
        if (existingInvitations.Any(i => i.InviteePubkey == request.InviteePubkey))
        {
            throw new InvalidOperationException("Pending invitation already exists");
        }

        var invitation = new MatchInvitation
        {
            InviterPubkey = request.InviterPubkey,
            InviteePubkey = request.InviteePubkey,
            GameMode = request.GameMode,
            MatchType = request.MatchType,
            StakeLamports = request.StakeLamports,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(request.ExpirationMinutes)
        };

        return await _invitationRepository.CreateAsync(invitation);
    }

    public async Task<MatchInvitation?> GetInvitationAsync(int invitationId)
    {
        return await _invitationRepository.GetByIdAsync(invitationId);
    }

    public async Task<IEnumerable<MatchInvitation>> GetUserInvitationsAsync(string pubkey, InvitationStatus? status = null)
    {
        var statusInt = status.HasValue ? (int)status.Value : null;
        return await _invitationRepository.GetUserInvitationsAsync(pubkey, statusInt);
    }

    public async Task<MatchInvitation> AcceptInvitationAsync(int invitationId, string inviteePubkey)
    {
        var invitation = await _invitationRepository.GetByIdAsync(invitationId);
        if (invitation == null)
        {
            throw new ArgumentException("Invitation not found");
        }

        if (invitation.InviteePubkey != inviteePubkey)
        {
            throw new UnauthorizedAccessException("You can only accept invitations sent to you");
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            throw new InvalidOperationException("Invitation is not pending");
        }

        if (invitation.ExpiresAt.HasValue && invitation.ExpiresAt.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Invitation has expired");
        }

        // Update invitation status
        invitation.Status = InvitationStatus.Accepted;
        
        // Here you would typically create the match on-chain
        // For now, we'll just mark it as accepted
        // invitation.MatchPda = "generated_match_pda"; // This would come from blockchain transaction

        return await _invitationRepository.UpdateAsync(invitation);
    }

    public async Task<MatchInvitation> DeclineInvitationAsync(int invitationId, string inviteePubkey)
    {
        var invitation = await _invitationRepository.GetByIdAsync(invitationId);
        if (invitation == null)
        {
            throw new ArgumentException("Invitation not found");
        }

        if (invitation.InviteePubkey != inviteePubkey)
        {
            throw new UnauthorizedAccessException("You can only decline invitations sent to you");
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            throw new InvalidOperationException("Invitation is not pending");
        }

        invitation.Status = InvitationStatus.Declined;
        return await _invitationRepository.UpdateAsync(invitation);
    }

    public async Task<MatchInvitation> CancelInvitationAsync(int invitationId, string inviterPubkey)
    {
        var invitation = await _invitationRepository.GetByIdAsync(invitationId);
        if (invitation == null)
        {
            throw new ArgumentException("Invitation not found");
        }

        if (invitation.InviterPubkey != inviterPubkey)
        {
            throw new UnauthorizedAccessException("You can only cancel invitations you sent");
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            throw new InvalidOperationException("Invitation is not pending");
        }

        invitation.Status = InvitationStatus.Cancelled;
        return await _invitationRepository.UpdateAsync(invitation);
    }

    public async Task CleanupExpiredInvitationsAsync()
    {
        var expiredInvitations = await _invitationRepository.GetExpiredInvitationsAsync();
        
        foreach (var invitation in expiredInvitations)
        {
            invitation.Status = InvitationStatus.Expired;
            await _invitationRepository.UpdateAsync(invitation);
        }
    }
}
