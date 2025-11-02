using Microsoft.EntityFrameworkCore;
using SolanaPvP.Domain.Enums;

namespace SolanaPvP.EF_Core.DBOs;

[PrimaryKey(nameof(MatchPda))]
public class MatchDBO
{
    public string MatchPda { get; set; } = string.Empty;
    public GameModeType GameMode { get; set; }
    public SolanaPvP.Domain.Enums.MatchType MatchType { get; set; }
    public long StakeLamports { get; set; }
    public MatchStatus Status { get; set; }
    public long DeadlineTs { get; set; }
    public int? WinnerSide { get; set; }
    public string CreateTx { get; set; } = string.Empty;
    public string? JoinTx { get; set; }
    public string? PayoutTx { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public bool IsPrivate { get; set; } = false;
    public int? InvitationId { get; set; }

    // Navigation properties
    public ICollection<MatchParticipantDBO> Participants { get; set; } = new List<MatchParticipantDBO>();
    public GameDataDBO? GameData { get; set; }
    public MatchInvitationDBO? Invitation { get; set; }
}
