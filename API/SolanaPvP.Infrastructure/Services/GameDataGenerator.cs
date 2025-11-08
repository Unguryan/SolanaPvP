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
            "Plinko" => await GeneratePlinkoScores(match, winnerSide),
            // Future games:
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

    private Task<GameData> GeneratePlinkoScores(Match match, int winnerSide)
    {
        // Available slot values for each game mode (symmetric distribution)
        int[] slotValues;
        int ballCount;
        
        switch (match.GameMode)
        {
            case "Plinko3Balls5Rows":
                // 3 balls, 7 slots: [100, 50, 10, 1, 10, 50, 100]
                slotValues = new[] { 100, 50, 10, 1, 10, 50, 100 };
                ballCount = 3;
                break;
            case "Plinko5Balls7Rows":
                // 5 balls, 9 slots: [200, 100, 50, 20, 5, 20, 50, 100, 200]
                slotValues = new[] { 200, 100, 50, 20, 5, 20, 50, 100, 200 };
                ballCount = 5;
                break;
            case "Plinko7Balls9Rows":
                // 7 balls, 11 slots: [500, 250, 150, 75, 20, 5, 20, 75, 150, 250, 500]
                slotValues = new[] { 500, 250, 150, 75, 20, 5, 20, 75, 150, 250, 500 };
                ballCount = 7;
                break;
            default:
                // Default to 5 balls mode
                slotValues = new[] { 200, 100, 50, 20, 5, 20, 50, 100, 200 };
                ballCount = 5;
                break;
        }
        
        // Generate realistic score by summing random slot values
        int side0Score = GenerateRealisticPlinkoScore(slotValues, ballCount);
        int side1Score = GenerateRealisticPlinkoScore(slotValues, ballCount);
        
        // Ensure winner has higher score (add one more high-value slot if needed)
        if ((winnerSide == 0 && side0Score <= side1Score) || (winnerSide == 1 && side1Score <= side0Score))
        {
            // Winner needs advantage - add a high-value slot
            var highValues = slotValues.Where(v => v >= slotValues.Max() * 0.5).ToArray();
            var bonusValue = highValues[_random.Next(highValues.Length)];
            
            if (winnerSide == 0)
                side0Score += bonusValue;
            else
                side1Score += bonusValue;
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

        _logger.LogInformation("[GameDataGenerator] ✅ Generated Plinko data for mode {GameMode} ({BallCount} balls) - Side0: {Side0Score}, Side1: {Side1Score}, Winner: Side {WinnerSide}", 
            match.GameMode, ballCount, side0Score, side1Score, winnerSide);

        return Task.FromResult(gameData);
    }
    
    private int GenerateRealisticPlinkoScore(int[] slotValues, int ballCount)
    {
        int totalScore = 0;
        
        // Generate realistic score by picking random slots
        for (int i = 0; i < ballCount; i++)
        {
            // Pick random slot (weighted slightly toward middle for realism)
            int randomIndex = _random.Next(slotValues.Length);
            totalScore += slotValues[randomIndex];
        }
        
        return totalScore;
    }
}
