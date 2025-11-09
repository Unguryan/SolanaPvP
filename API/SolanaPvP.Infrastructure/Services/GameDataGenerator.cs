using Microsoft.Extensions.Logging;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;
using System.Text.Json;

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
        _logger.LogInformation("[GameDataGenerator] Generating game data for match {MatchPda}, GameType: {GameType}, Mode: {GameMode}, TeamSize: {TeamSize}, Winner side: {WinnerSide}", 
            match.MatchPda, match.GameType, match.GameMode, match.TeamSize, winnerSide);
        
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
        
        // Parse team size to determine players per side
        var teamSize = ParseTeamSize(match.TeamSize);
        var side0Participants = match.Participants.Where(p => p.Side == 0).ToList();
        var side1Participants = match.Participants.Where(p => p.Side == 1).ToList();
        
        // Generate individual scores for each player
        var playerScores = new Dictionary<string, int>();
        int side0Score = 0;
        int side1Score = 0;
        
        // Generate scores for Side 0
        foreach (var participant in side0Participants)
        {
            var score = _random.Next(minScore, maxScore);
            playerScores[participant.Pubkey] = score;
            side0Score += score;
        }
        
        // Generate scores for Side 1
        foreach (var participant in side1Participants)
        {
            var score = _random.Next(minScore, maxScore);
            playerScores[participant.Pubkey] = score;
            side1Score += score;
        }
        
        // Ensure winner has higher score (add bonus to random player on winning side)
        if ((winnerSide == 0 && side0Score <= side1Score) || (winnerSide == 1 && side1Score <= side0Score))
        {
            var winnerParticipants = winnerSide == 0 ? side0Participants : side1Participants;
            if (winnerParticipants.Count > 0)
            {
                var randomWinnerPlayer = winnerParticipants[_random.Next(winnerParticipants.Count)];
                var advantagePercent = _random.Next(5, 16) / 100.0;
                var bonusValue = (int)(minScore * advantagePercent);
                
                playerScores[randomWinnerPlayer.Pubkey] += bonusValue;
                
                if (winnerSide == 0)
                    side0Score += bonusValue;
                else
                    side1Score += bonusValue;
                    
                _logger.LogInformation("[GameDataGenerator] Added bonus {Bonus} to player {Pubkey} on winning side {Side}", 
                    bonusValue, randomWinnerPlayer.Pubkey, winnerSide);
            }
        }

        // Create GameData with individual player scores
        var gameData = new GameData
        {
            MatchPda = match.MatchPda,
            GameMode = match.GameMode,
            Side0TotalScore = side0Score,
            Side1TotalScore = side1Score,
            PlayerScoresJson = JsonSerializer.Serialize(playerScores), // NEW!
            GeneratedAt = DateTime.UtcNow
        };

        _logger.LogInformation("[GameDataGenerator] ✅ Generated PickHigher data for mode {GameMode} ({TeamSize}) - Side0: {Side0Score}, Side1: {Side1Score}, Winner: Side {WinnerSide}, Players: {PlayerCount}", 
            match.GameMode, match.TeamSize, side0Score, side1Score, winnerSide, playerScores.Count);

        return Task.FromResult(gameData);
    }

    private Task<GameData> GeneratePlinkoScores(Match match, int winnerSide)
    {
        // Available slot values for each game mode (symmetric distribution)
        int[] slotValues;
        int ballCount;
        
        switch (match.GameMode)
        {
            case "Plinko3Balls":
                // 3 balls, 7 slots: [100, 50, 10, 1, 10, 50, 100]
                slotValues = new[] { 100, 50, 10, 1, 10, 50, 100 };
                ballCount = 3;
                break;
            case "Plinko5Balls":
                // 5 balls, 9 slots: [200, 100, 50, 20, 5, 20, 50, 100, 200]
                slotValues = new[] { 200, 100, 50, 20, 5, 20, 50, 100, 200 };
                ballCount = 5;
                break;
            case "Plinko7Balls":
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
        
        // Parse team size to determine players per side
        var teamSize = ParseTeamSize(match.TeamSize);
        var side0Participants = match.Participants.Where(p => p.Side == 0).ToList();
        var side1Participants = match.Participants.Where(p => p.Side == 1).ToList();
        
        // Generate individual scores for each player
        var playerScores = new Dictionary<string, int>();
        int side0Score = 0;
        int side1Score = 0;
        
        // Generate scores for Side 0
        foreach (var participant in side0Participants)
        {
            var score = GenerateRealisticPlinkoScore(slotValues, ballCount);
            playerScores[participant.Pubkey] = score;
            side0Score += score;
        }
        
        // Generate scores for Side 1
        foreach (var participant in side1Participants)
        {
            var score = GenerateRealisticPlinkoScore(slotValues, ballCount);
            playerScores[participant.Pubkey] = score;
            side1Score += score;
        }
        
        // Ensure winner has higher score (add bonus to random player on winning side)
        if ((winnerSide == 0 && side0Score <= side1Score) || (winnerSide == 1 && side1Score <= side0Score))
        {
            var winnerParticipants = winnerSide == 0 ? side0Participants : side1Participants;
            if (winnerParticipants.Count > 0)
            {
                var randomWinnerPlayer = winnerParticipants[_random.Next(winnerParticipants.Count)];
                var highValues = slotValues.Where(v => v >= slotValues.Max() * 0.5).ToArray();
                var bonusValue = highValues[_random.Next(highValues.Length)];
                
                playerScores[randomWinnerPlayer.Pubkey] += bonusValue;
                
                if (winnerSide == 0)
                    side0Score += bonusValue;
                else
                    side1Score += bonusValue;
                    
                _logger.LogInformation("[GameDataGenerator] Added bonus {Bonus} to player {Pubkey} on winning side {Side}", 
                    bonusValue, randomWinnerPlayer.Pubkey, winnerSide);
            }
        }
        
        // Create GameData with individual player scores
        var gameData = new GameData
        {
            MatchPda = match.MatchPda,
            GameMode = match.GameMode,
            Side0TotalScore = side0Score,
            Side1TotalScore = side1Score,
            PlayerScoresJson = JsonSerializer.Serialize(playerScores), // NEW!
            GeneratedAt = DateTime.UtcNow
        };

        _logger.LogInformation("[GameDataGenerator] ✅ Generated Plinko data for mode {GameMode} ({BallCount} balls, {TeamSize}) - Side0: {Side0Score}, Side1: {Side1Score}, Winner: Side {WinnerSide}, Players: {PlayerCount}", 
            match.GameMode, ballCount, match.TeamSize, side0Score, side1Score, winnerSide, playerScores.Count);

        return Task.FromResult(gameData);
    }
    
    private int GenerateRealisticPlinkoScore(int[] slotValues, int ballCount)
    {
        int totalScore = 0;
        
        // Generate realistic score using WEIGHTED distribution (physics-based!)
        // Slots closer to center have HIGHER probability (like real Plinko)
        for (int i = 0; i < ballCount; i++)
        {
            int slotIndex = GenerateWeightedSlotIndex(slotValues.Length);
            totalScore += slotValues[slotIndex];
        }
        
        return totalScore;
    }
    
    private int GenerateWeightedSlotIndex(int slotCount)
    {
        // Generate slot index with binomial-like distribution
        // Center slots (low values) have HIGHER probability
        // Edge slots (high values) have LOWER probability
        
        // Use binomial distribution approximation
        // For odd slotCount (7, 9, 11), center is at (slotCount - 1) / 2
        int center = (slotCount - 1) / 2;
        
        // Generate weighted random index using normal distribution approximation
        // Standard deviation controls spread (smaller = more centered)
        double stdDev = slotCount / 4.0; // ~25% of slots as std dev
        
        // Box-Muller transform for normal distribution
        double u1 = 1.0 - _random.NextDouble(); // Uniform(0,1]
        double u2 = 1.0 - _random.NextDouble();
        double randStdNormal = Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Sin(2.0 * Math.PI * u2);
        
        // Scale and shift to center
        double randomValue = center + stdDev * randStdNormal;
        
        // Clamp to valid range [0, slotCount - 1]
        int slotIndex = (int)Math.Round(randomValue);
        slotIndex = Math.Max(0, Math.Min(slotCount - 1, slotIndex));
        
        return slotIndex;
    }
    
    private int ParseTeamSize(string teamSize)
    {
        // TeamSize format: "1v1", "2v2", "5v5", etc.
        // Returns number of players per side
        if (string.IsNullOrEmpty(teamSize)) return 1;
        
        var parts = teamSize.Split('v');
        if (parts.Length == 2 && int.TryParse(parts[0], out var size))
        {
            return size;
        }
        
        return 1; // Default to 1v1
    }
}
