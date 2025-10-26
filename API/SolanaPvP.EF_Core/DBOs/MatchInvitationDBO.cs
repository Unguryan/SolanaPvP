using Microsoft.EntityFrameworkCore;
using SolanaPvP.Domain.Enums;

namespace SolanaPvP.EF_Core.DBOs;

[PrimaryKey(nameof(Id))]
public class MatchInvitationDBO
{
    public int Id { get; set; }
    public string InviterPubkey { get; set; } = string.Empty;
    public string InviteePubkey { get; set; } = string.Empty;
    public GameModeType GameMode { get; set; }
    public MatchType MatchType { get; set; }
    public long StakeLamports { get; set; }
    public InvitationStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? MatchPda { get; set; }

    // Navigation properties
    public UserDBO Inviter { get; set; } = null!;
    public UserDBO Invitee { get; set; } = null!;
    public MatchDBO? Match { get; set; }
}
