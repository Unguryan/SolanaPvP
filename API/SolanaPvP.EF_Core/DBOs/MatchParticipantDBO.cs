using Microsoft.EntityFrameworkCore;

namespace SolanaPvP.EF_Core.DBOs;

[PrimaryKey(nameof(Id))]
public class MatchParticipantDBO
{
    public int Id { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string Pubkey { get; set; } = string.Empty;
    public int Side { get; set; }
    public int Position { get; set; }
    public int? TargetScore { get; set; }
    public bool? IsWinner { get; set; }

    // Navigation properties
    public MatchDBO Match { get; set; } = null!;
    public UserDBO User { get; set; } = null!;
}
