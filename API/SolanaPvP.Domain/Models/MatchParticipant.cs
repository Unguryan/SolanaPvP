namespace SolanaPvP.Domain.Models;

public class MatchParticipant
{
    public int Id { get; set; }
    public string MatchPda { get; set; } = string.Empty;
    public string Pubkey { get; set; } = string.Empty;
    public int Side { get; set; } // 0 или 1
    public int Position { get; set; } // для команд: 0-4 в каждой команде
    public int? TargetScore { get; set; } // целевое число, которое должен "набрать" игрок (для PickHigher/Plinko/GoldBars)
    public bool? IsWinner { get; set; } // флаг победы/поражения для этого участника (true = найдет приз, false = попадет на бомбу для Miner)

    // Navigation properties
    public Match Match { get; set; } = null!;
    public User User { get; set; } = null!;
}
