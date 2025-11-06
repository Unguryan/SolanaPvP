using SolanaPvP.Domain.Enums;

namespace SolanaPvP.Domain.Models;

public class Match
{
    public string MatchPda { get; set; } = string.Empty;
    public string CreatorPubkey { get; set; } = string.Empty;
    public string GameType { get; set; } = string.Empty; // CHANGED: "PickHigher", "Plinko", "Dice", etc.
    public string GameMode { get; set; } = string.Empty; // "1x3", "3x9", "5x16", etc.
    public string MatchMode { get; set; } = string.Empty; // CHANGED: "SingleBattle", "DeathMatch"
    public string TeamSize { get; set; } = string.Empty; // CHANGED: "1v1", "2v2", "5v5", "1v10", etc.
    public long StakeLamports { get; set; }
    public MatchStatus Status { get; set; }
    public long DeadlineTs { get; set; }
    public int? WinnerSide { get; set; } // 0=Side1, 1=Side2
    public string? RandomnessAccount { get; set; } // Orao VRF randomness account
    public string CreateTx { get; set; } = string.Empty;
    public string? JoinTx { get; set; }
    public string? PayoutTx { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? PendingAt { get; set; } // When lobby filled and moved to Pending status
    public DateTime? GameStartTime { get; set; } // When InProgress starts (+3 sec from resolve)
    public DateTime? ResolvedAt { get; set; }
    public bool IsPrivate { get; set; } = false; // True for invitation-based matches
    public int? InvitationId { get; set; } // Reference to the invitation that created this match

    // Navigation properties
    public ICollection<MatchParticipant> Participants { get; set; } = new List<MatchParticipant>();
    public GameData? GameData { get; set; }
    public MatchInvitation? Invitation { get; set; }
}
