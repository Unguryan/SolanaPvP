namespace SolanaPvP.Domain.Models;

public class GameData
{
    public int Id { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string GameMode { get; set; } = string.Empty; // CHANGED: from enum to string ("PickHigher1v3", "PickHigher3v9", "PickHigher5v16", "Plinko3Balls", etc.)
    public int Side0TotalScore { get; set; } // суммарное число для Side 0
    public int Side1TotalScore { get; set; } // суммарное число для Side 1
    public DateTime GeneratedAt { get; set; }
    
    // NEW: Individual player scores for team modes (JSON)
    // Format for PickHigher/Plinko/GoldBars: { "pubkey1": 150, "pubkey2": 185, ... } (integer targetScore)
    // Format for Miner: { "pubkey1": true, "pubkey2": false, ... } (true = prize, false = bomb)
    // For GoldBars: values are targetScore (number of gold bars to open, 0 to totalGoldBars)
    public string? PlayerScoresJson { get; set; }

    // Navigation properties
    public Match Match { get; set; } = null!;
}
