using SolanaPvP.Domain.Enums;

namespace SolanaPvP.Domain.Models;

public class GameData
{
    public int Id { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public GameModeType GameMode { get; set; }
    public int Side0TotalScore { get; set; } // суммарное число для Side 0
    public int Side1TotalScore { get; set; } // суммарное число для Side 1
    public DateTime GeneratedAt { get; set; }

    // Navigation properties
    public Match Match { get; set; } = null!;
}
