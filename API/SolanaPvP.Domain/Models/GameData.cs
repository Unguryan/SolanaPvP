namespace SolanaPvP.Domain.Models;

public class GameData
{
    public int Id { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string GameMode { get; set; } = string.Empty; // CHANGED: from enum to string ("1x3", "3x9", "5x16")
    public int Side0TotalScore { get; set; } // суммарное число для Side 0
    public int Side1TotalScore { get; set; } // суммарное число для Side 1
    public DateTime GeneratedAt { get; set; }

    // Navigation properties
    public Match Match { get; set; } = null!;
}
