using Microsoft.Extensions.Logging;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;

namespace SolanaPvP.Infrastructure.Services;

public class GameDataGenerator : IGameDataGenerator
{
    private readonly Random _random = new();
    private readonly ILogger<GameDataGenerator> _logger;

    public GameDataGenerator(ILogger<GameDataGenerator> logger)
    {
        _logger = logger;
    }

    public async Task<GameData> GenerateGameDataAsync(Match match, int winnerSide)
    {
        _logger.LogInformation("[GameDataGenerator] Generating game data for match {MatchPda}, GameType: {GameType}, Mode: {GameMode}, Winner side: {WinnerSide}", 
            match.MatchPda, match.GameType, match.GameMode, winnerSide);
        
        // Generic game data generation based on GameType
        return match.GameType switch
        {
            "PickHigher" => await GeneratePickHigherScores(match, winnerSide),
            // Future games:
            // "Plinko" => await GeneratePlinkoScores(match, winnerSide),
            // "Dice" => await GenerateDiceScores(match, winnerSide),
            _ => throw new NotSupportedException($"Game type {match.GameType} not supported")
        };
    }

    private Task<GameData> GeneratePickHigherScores(Match match, int winnerSide)
    {
        // Determine score range based on game mode
        // Lower max for simpler games (fewer selections)
        int minScore, maxScore;
        switch (match.GameMode)
        {
            case "1x3":
                // Pick 1 from 3: one card = full score, keep it low for variety
                minScore = 500;
                maxScore = 1001; // Max 1000
                break;
            case "3x9":
                // Pick 3 from 9: 3 cards sum to score, moderate range
                minScore = 900;
                maxScore = 1801; // Max 1800
                break;
            case "5x16":
                // Pick 5 from 16: 5 cards sum to score, higher range
                minScore = 1500;
                maxScore = 2501; // Max 2500
                break;
            default:
                // Default range
                minScore = 1000;
                maxScore = 2001;
                break;
        }
        
        // Generate base scores within game mode range
        var baseScore = _random.Next(minScore, maxScore);
        
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

        _logger.LogInformation("[GameDataGenerator] ✅ Generated PickHigher data for mode {GameMode} - Side0: {Side0Score}, Side1: {Side1Score}, Winner: Side {WinnerSide}", 
            match.GameMode, side0Score, side1Score, winnerSide);

        return Task.FromResult(gameData);
    }
}
