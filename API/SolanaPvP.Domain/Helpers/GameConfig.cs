namespace SolanaPvP.Domain.Helpers;

/// <summary>
/// Central configuration for all game types, modes, arena types, and team sizes.
/// This is the single source of truth for valid game configurations.
/// </summary>
public static class GameConfig
{
    // ===================== GAMES =====================
    
    /// <summary>
    /// Available game types
    /// </summary>
    public static class Games
    {
        public const string PickHigher = "PickHigher";
        public const string Plinko = "Plinko";
        public const string Miner = "Miner";
        public const string Dice = "Dice";
        
        public static readonly string[] All = { PickHigher, Plinko, Miner, Dice };
    }
    
    // ===================== GAME MODES =====================
    
    /// <summary>
    /// Game modes for PickHigher game
    /// </summary>
    public static class PickHigherModes
    {
        public const string OneFromThree = "PickHigher1v3";
        public const string ThreeFromNine = "PickHigher3v9";
        public const string FiveFromSixteen = "PickHigher5v16";
        
        public static readonly string[] All = { OneFromThree, ThreeFromNine, FiveFromSixteen };
    }
    
    /// <summary>
    /// Game modes for Plinko game (for future use)
    /// </summary>
    public static class PlinkoModes
    {
        public const string Classic = "Classic";
        public const string Advanced = "Advanced";
        
        public static readonly string[] All = { Classic, Advanced };
    }
    
    /// <summary>
    /// Game modes for Miner game
    /// </summary>
    public static class MinerModes
    {
        public const string OneVsNine = "Miner1v9";      // 3x3 grid
        public const string ThreeVsSixteen = "Miner3v16"; // 4x4 grid
        public const string FiveVsTwentyFive = "Miner5v25"; // 5x5 grid
        
        public static readonly string[] All = { OneVsNine, ThreeVsSixteen, FiveVsTwentyFive };
    }
    
    /// <summary>
    /// Game modes for Dice game (for future use)
    /// </summary>
    public static class DiceModes
    {
        public const string Single = "Single";
        public const string Double = "Double";
        
        public static readonly string[] All = { Single, Double };
    }
    
    // ===================== ARENA TYPES =====================
    
    /// <summary>
    /// Arena types determine payout multipliers
    /// </summary>
    public static class ArenaTypes
    {
        /// <summary>
        /// Single Battle: 1v1, 2v2, 5v5 - Winner takes all (x2 payout)
        /// </summary>
        public const string SingleBattle = "SingleBattle";
        
        /// <summary>
        /// Death Match: 1v10, 2v20, 4v40 - One winner takes all (x10 payout)
        /// </summary>
        public const string DeathMatch = "DeathMatch";
        
        public static readonly string[] All = { SingleBattle, DeathMatch };
    }
    
    // ===================== TEAM SIZES =====================
    
    /// <summary>
    /// Team sizes for Single Battle arena (x2 payout)
    /// </summary>
    public static class SingleBattleTeamSizes
    {
        public const string OneVsOne = "1v1";
        public const string TwoVsTwo = "2v2";
        public const string FiveVsFive = "5v5";
        
        public static readonly string[] All = { OneVsOne, TwoVsTwo, FiveVsFive };
    }
    
    /// <summary>
    /// Team sizes for Death Match arena (x10 payout)
    /// </summary>
    public static class DeathMatchTeamSizes
    {
        public const string OneVsTen = "1v10";
        public const string TwoVsTwenty = "2v20";
        public const string FourVsForty = "4v40";
        
        public static readonly string[] All = { OneVsTen, TwoVsTwenty, FourVsForty };
    }
    
    // ===================== PAYOUT MULTIPLIERS =====================
    
    /// <summary>
    /// Payout multipliers for different arena types
    /// </summary>
    public static class PayoutMultipliers
    {
        public const int SingleBattle = 2;  // x2 payout
        public const int DeathMatch = 10;   // x10 payout
    }
    
    // ===================== HELPER METHODS =====================
    
    /// <summary>
    /// Get payout multiplier for arena type
    /// </summary>
    public static int GetPayoutMultiplier(string arenaType)
    {
        return arenaType switch
        {
            ArenaTypes.SingleBattle => PayoutMultipliers.SingleBattle,
            ArenaTypes.DeathMatch => PayoutMultipliers.DeathMatch,
            _ => PayoutMultipliers.SingleBattle // default
        };
    }
    
    /// <summary>
    /// Validate if game mode is valid for given game
    /// </summary>
    public static bool IsValidGameMode(string game, string gameMode)
    {
        return game switch
        {
            Games.PickHigher => PickHigherModes.All.Contains(gameMode),
            Games.Plinko => PlinkoModes.All.Contains(gameMode),
            Games.Miner => MinerModes.All.Contains(gameMode),
            Games.Dice => DiceModes.All.Contains(gameMode),
            _ => false
        };
    }
    
    /// <summary>
    /// Validate if team size is valid for given arena type
    /// </summary>
    public static bool IsValidTeamSize(string arenaType, string teamSize)
    {
        return arenaType switch
        {
            ArenaTypes.SingleBattle => SingleBattleTeamSizes.All.Contains(teamSize),
            ArenaTypes.DeathMatch => DeathMatchTeamSizes.All.Contains(teamSize),
            _ => false
        };
    }
    
    /// <summary>
    /// Get numeric team size from string (e.g., "1v1" -> 1, "1v10" -> 1)
    /// Returns the size of ONE team (not total players)
    /// </summary>
    public static int GetNumericTeamSize(string teamSize)
    {
        var parts = teamSize.Split('v');
        if (parts.Length == 2 && int.TryParse(parts[0], out var size))
        {
            return size;
        }
        return 1; // default
    }
}

