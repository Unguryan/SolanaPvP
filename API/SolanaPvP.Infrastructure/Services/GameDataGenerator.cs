using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;

namespace SolanaPvP.Infrastructure.Services;

public class GameDataGenerator : IGameDataGenerator
{
    private readonly Random _random = new();

    public async Task<GameData> GenerateGameDataAsync(Match match, int winnerSide)
    {
        // Generate base scores (1000-2000 range)
        var baseScore = _random.Next(1000, 2001);
        
        // Generate scores with winner having 5-15% advantage
        var advantagePercent = _random.Next(5, 16) / 100.0;
        var advantage = (int)(baseScore * advantagePercent);
        
        int side0Score, side1Score;
        if (winnerSide == 0)
        {
            side0Score = baseScore + advantage;
            side1Score = baseScore;
        }
        else
        {
            side0Score = baseScore;
            side1Score = baseScore + advantage;
        }

        // Create GameData
        var gameData = new GameData
        {
            MatchPda = match.MatchPda,
            GameMode = match.GameMode,
            Side0TotalScore = side0Score,
            Side1TotalScore = side1Score,
            GeneratedAt = DateTime.UtcNow
        };

        return await Task.FromResult(gameData);
    }
}
