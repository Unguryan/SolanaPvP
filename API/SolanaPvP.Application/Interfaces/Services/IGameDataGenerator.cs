using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Services;

public interface IGameDataGenerator
{
    Task<GameData> GenerateGameDataAsync(Match match, string winnerPubkey);
}

public class GameDataGenerationResult
{
    public GameData GameData { get; set; } = null!;
    public List<MatchParticipant> UpdatedParticipants { get; set; } = new();
}
