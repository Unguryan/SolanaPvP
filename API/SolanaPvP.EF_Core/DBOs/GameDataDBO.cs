using Microsoft.EntityFrameworkCore;

namespace SolanaPvP.EF_Core.DBOs;

[PrimaryKey(nameof(Id))]
public class GameDataDBO
{
    public int Id { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string GameMode { get; set; } = string.Empty; // CHANGED: from enum to string
    public int Side0TotalScore { get; set; }
    public int Side1TotalScore { get; set; }
    public DateTime GeneratedAt { get; set; }
    
    // NEW: Individual player scores for team modes (JSON)
    public string? PlayerScoresJson { get; set; }

    // Navigation properties
    public MatchDBO Match { get; set; } = null!;
}
