using SolanaPvP.Domain.Enums;

namespace SolanaPvP.Domain.Helpers;

/// <summary>
/// Helper class for mapping blockchain game mode values to new architecture
/// </summary>
public static class GameModeMapper
{
    /// <summary>
    /// Maps blockchain team_size numeric value to TeamSize string
    /// LEGACY: Now blockchain sends strings directly, this is for backward compatibility
    /// </summary>
    [Obsolete("Blockchain now sends team size as string (e.g., '1v1'). Use the string value directly.")]
    public static string MapTeamSizeFromBlockchain(int teamSize)
    {
        return teamSize switch
        {
            1 => "1v1",      // 1v1 = 2 players total
            2 => "2v2",      // 2v2 = 4 players total
            5 => "5v5",      // 5v5 = 10 players total
            _ => "1v1"       // Default to 1v1
        };
    }

    /// <summary>
    /// Maps blockchain game_mode value to our string GameMode format
    /// </summary>
    public static string MapGameModeFromBlockchain(int gameModeId)
    {
        return gameModeId switch
        {
            0 => "3x9",   // PickThreeFromNine
            1 => "5x16",  // PickFiveFromSixteen
            2 => "1x3",   // PickOneFromThree
            _ => "3x9"    // Default
        };
    }

    /// <summary>
    /// LEGACY: Returns default game type as string
    /// Blockchain now sends this value directly, this is for backward compatibility
    /// </summary>
    [Obsolete("Blockchain now sends game type as string. Use the blockchain value directly.")]
    public static string GetDefaultGameType() => "PickHigher";
    
    /// <summary>
    /// LEGACY: Returns default match mode as string
    /// Blockchain now sends this value directly, this is for backward compatibility
    /// </summary>
    [Obsolete("Blockchain now sends arena type as string. Use the blockchain value directly.")]
    public static string GetDefaultMatchMode() => "SingleBattle";
}

