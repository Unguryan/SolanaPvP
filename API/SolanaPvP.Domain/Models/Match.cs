using SolanaPvP.Domain.Enums;

namespace SolanaPvP.Domain.Models;

public class Match
{
    public string MatchPda { get; set; } = string.Empty;
    public string CreatorPubkey { get; set; } = string.Empty;
    public GameModeType GameMode { get; set; }
    public SolanaPvP.Domain.Enums.MatchType MatchType { get; set; }
    public long StakeLamports { get; set; }
    public MatchStatus Status { get; set; }
    public long DeadlineTs { get; set; }
    public int? WinnerSide { get; set; } // 0=Side1, 1=Side2
    public string? RandomnessAccount { get; set; } // Switchboard OnDemand randomness account
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
