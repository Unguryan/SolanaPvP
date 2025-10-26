namespace SolanaPvP.Domain.Models;

public class User
{
    public string Pubkey { get; set; } = string.Empty;
    public int Wins { get; set; }
    public int Losses { get; set; }
    public long TotalEarningsLamports { get; set; }
    public int MatchesPlayed { get; set; }
    public DateTime FirstSeen { get; set; }
    public DateTime LastSeen { get; set; }

    // Navigation properties
    public ICollection<MatchParticipant> MatchParticipants { get; set; } = new List<MatchParticipant>();
}
