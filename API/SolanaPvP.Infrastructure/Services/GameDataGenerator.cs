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
            "Miner" => await GenerateMinerScores(match, winnerSide),
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
            case "PickHigher1v3":
                // Pick 1 from 3: one card = full score, keep it low for variety
                minScore = 500;
                maxScore = 1001; // Max 1000
                break;
            case "PickHigher3v9":
                // Pick 3 from 9: 3 cards sum to score, moderate range
                minScore = 900;
                maxScore = 1801; // Max 1800
                break;
            case "PickHigher5v16":
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
                // 3 balls, 5 slots: [50, 10, 5, 10, 50]
                slotValues = new[] { 50, 10, 5, 10, 50 };
                ballCount = 3;
                break;
            case "Plinko5Balls":
                // 5 balls, 7 slots: [100, 50, 10, 5, 10, 50, 100]
                slotValues = new[] { 100, 50, 10, 5, 10, 50, 100 };
                ballCount = 5;
                break;
            case "Plinko7Balls":
                // 7 balls, 9 slots: [200, 100, 50, 20, 5, 20, 50, 100, 200]
                slotValues = new[] { 200, 100, 50, 20, 5, 20, 50, 100, 200 };
                ballCount = 7;
                break;
            default:
                // Default to 5 balls mode
                slotValues = new[] { 100, 50, 10, 5, 10, 50, 100 };
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
        
        // Ensure winner has higher score
        // For Plinko: RE-GENERATE loser score if needed (no bonus - must be ACHIEVABLE!)
        int maxAttempts = 10;
        int attempts = 0;
        while (attempts < maxAttempts && 
               ((winnerSide == 0 && side0Score <= side1Score) || 
                (winnerSide == 1 && side1Score <= side0Score)))
        {
            attempts++;
            var loserParticipants = winnerSide == 0 ? side1Participants : side0Participants;
            
            if (loserParticipants.Count > 0)
            {
                // Re-generate loser scores with LOWER probability of high values
                foreach (var participant in loserParticipants)
                {
                    var newScore = GenerateRealisticPlinkoScore(slotValues, ballCount);
                    playerScores[participant.Pubkey] = newScore;
                }
                
                // Recalculate totals
                side0Score = 0;
                side1Score = 0;
                foreach (var participant in side0Participants)
                {
                    side0Score += playerScores[participant.Pubkey];
                }
                foreach (var participant in side1Participants)
                {
                    side1Score += playerScores[participant.Pubkey];
                }
                
                _logger.LogDebug("[GameDataGenerator] Re-generated loser scores (attempt {Attempt}): Side0={Side0Score}, Side1={Side1Score}", 
                    attempts, side0Score, side1Score);
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
        // Generate ACHIEVABLE score by picking random slot values
        // More weight to center slots (lower values) but allow edge slots (higher values)
        int totalScore = 0;
        
        // Create weighted pool: center slots appear MORE often
        var weightedSlots = new List<int>();
        int center = slotValues.Length / 2;
        
        for (int i = 0; i < slotValues.Length; i++)
        {
            // Weight based on distance from center (center = higher weight)
            int distanceFromCenter = Math.Abs(i - center);
            int weight = slotValues.Length - distanceFromCenter; // Center = max weight
            
            for (int w = 0; w < weight; w++)
            {
                weightedSlots.Add(i);
            }
        }
        
        // Pick ballCount random weighted slots
        for (int i = 0; i < ballCount; i++)
        {
            int randomIndex = _random.Next(weightedSlots.Count);
            int slotIndex = weightedSlots[randomIndex];
            totalScore += slotValues[slotIndex];
        }
        
        _logger.LogDebug("[GameDataGenerator] Generated Plinko score: {Score} for {BallCount} balls", totalScore, ballCount);
        
        return totalScore;
    }

    private Task<GameData> GenerateMinerScores(Match match, int winnerSide)
    {
        // Determine tile count based on game mode
        int tileCount;
        switch (match.GameMode)
        {
            case "Miner1v9":
                tileCount = 9; // 3x3 grid
                break;
            case "Miner3v16":
                tileCount = 16; // 4x4 grid
                break;
            case "Miner5v25":
                tileCount = 25; // 5x5 grid
                break;
            default:
                tileCount = 9; // Default to 1v9
                break;
        }

        var side0Participants = match.Participants.Where(p => p.Side == 0).ToList();
        var side1Participants = match.Participants.Where(p => p.Side == 1).ToList();
        
        // Generate boolean results for each player
        // true = will find prize, false = will hit bomb
        var playerResults = new Dictionary<string, bool>();
        
        // First, assign results based on winner side
        // Winner side gets more players with true (prize)
        var winnerParticipants = winnerSide == 0 ? side0Participants : side1Participants;
        var loserParticipants = winnerSide == 0 ? side1Participants : side0Participants;
        
        // Calculate how many players should find prize on each side
        // Ensure no tie: winner side must have more players with prize
        int totalPlayers = side0Participants.Count + side1Participants.Count;
        int winnerSidePrizeCount = (totalPlayers / 2) + 1; // At least one more than half
        int loserSidePrizeCount = totalPlayers - winnerSidePrizeCount;
        
        // Ensure we don't exceed team size
        winnerSidePrizeCount = Math.Min(winnerSidePrizeCount, winnerParticipants.Count);
        loserSidePrizeCount = Math.Min(loserSidePrizeCount, loserParticipants.Count);
        
        // Assign prizes to winner side players
        var shuffledWinners = winnerParticipants.OrderBy(x => _random.Next()).ToList();
        for (int i = 0; i < winnerSidePrizeCount; i++)
        {
            playerResults[shuffledWinners[i].Pubkey] = true;
        }
        for (int i = winnerSidePrizeCount; i < winnerParticipants.Count; i++)
        {
            playerResults[shuffledWinners[i].Pubkey] = false;
        }
        
        // Assign prizes to loser side players (fewer prizes)
        var shuffledLosers = loserParticipants.OrderBy(x => _random.Next()).ToList();
        for (int i = 0; i < loserSidePrizeCount; i++)
        {
            playerResults[shuffledLosers[i].Pubkey] = true;
        }
        for (int i = loserSidePrizeCount; i < loserParticipants.Count; i++)
        {
            playerResults[shuffledLosers[i].Pubkey] = false;
        }
        
        // Update IsWinner for each participant
        foreach (var participant in match.Participants)
        {
            participant.IsWinner = playerResults[participant.Pubkey];
        }
        
        // Calculate side scores (count of players with prize)
        int side0PrizeCount = side0Participants.Count(p => playerResults[p.Pubkey]);
        int side1PrizeCount = side1Participants.Count(p => playerResults[p.Pubkey]);
        
        // Create GameData with boolean results
        var gameData = new GameData
        {
            MatchPda = match.MatchPda,
            GameMode = match.GameMode,
            Side0TotalScore = side0PrizeCount, // Count of players who found prize
            Side1TotalScore = side1PrizeCount, // Count of players who found prize
            PlayerScoresJson = JsonSerializer.Serialize(playerResults), // {"pubkey1": true, "pubkey2": false}
            GeneratedAt = DateTime.UtcNow
        };

        _logger.LogInformation("[GameDataGenerator] ✅ Generated Miner data for mode {GameMode} ({TileCount} tiles, {TeamSize}) - Side0 prizes: {Side0PrizeCount}, Side1 prizes: {Side1PrizeCount}, Winner: Side {WinnerSide}, Players: {PlayerCount}", 
            match.GameMode, tileCount, match.TeamSize, side0PrizeCount, side1PrizeCount, winnerSide, playerResults.Count);

        return Task.FromResult(gameData);
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
