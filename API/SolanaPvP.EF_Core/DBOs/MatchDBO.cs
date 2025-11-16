using Microsoft.EntityFrameworkCore;
using SolanaPvP.Domain.Enums;

namespace SolanaPvP.EF_Core.DBOs;

[PrimaryKey(nameof(MatchPda))]
public class MatchDBO
{
    public string MatchPda { get; set; } = string.Empty;
    public string CreatorPubkey { get; set; } = string.Empty;
    public string GameType { get; set; } = string.Empty; // CHANGED: "PickHigher", "Plinko", "Dice", etc.
    public string GameMode { get; set; } = string.Empty; // "PickHigher1v3", "PickHigher3v9", "PickHigher5v16", "Plinko3Balls", "Miner1v9", etc.
    public string MatchMode { get; set; } = string.Empty; // CHANGED: "SingleBattle", "DeathMatch"
    public string TeamSize { get; set; } = string.Empty; // CHANGED: "1v1", "2v2", "5v5", "1v10", etc.
    public long StakeLamports { get; set; }
    public MatchStatus Status { get; set; }
    public long DeadlineTs { get; set; }
    public int? WinnerSide { get; set; }
    public string? RandomnessAccount { get; set; }
    public string CreateTx { get; set; } = string.Empty;
    public string? JoinTx { get; set; }
    public string? PayoutTx { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? PendingAt { get; set; }
    public DateTime? GameStartTime { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public bool IsPrivate { get; set; } = false;
    public int? InvitationId { get; set; }

    // Navigation properties
    public ICollection<MatchParticipantDBO> Participants { get; set; } = new List<MatchParticipantDBO>();
    public GameDataDBO? GameData { get; set; }
    public MatchInvitationDBO? Invitation { get; set; }
}
