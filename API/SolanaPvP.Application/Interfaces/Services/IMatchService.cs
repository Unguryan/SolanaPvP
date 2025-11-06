using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Services;

public interface IMatchService
{
    Task<PagedResult<MatchView>> GetMatchesAsync(MatchFilter filter, Paging paging);
    Task<PagedResult<MatchView>> GetActiveMatchesAsync(Paging paging);
    Task<List<MatchView>> GetRecentResolvedMatchesAsync(int count = 10);
    Task<MatchDetails?> GetMatchAsync(string matchPda);
    Task<UserProfile?> GetUserAsync(string pubkey);
    Task<UserProfile?> GetUserByUsernameAsync(string username);
    Task<UserProfile> CreateUserAsync(string pubkey);
    Task<LeaderboardResult> GetLeaderboardAsync(LeaderboardType type, LeaderboardPeriod period, Paging paging);
    Task<PagedResult<MatchView>> GetUserMatchesAsync(string pubkey, Paging paging);
    Task<UserStatistics?> GetUserStatisticsAsync(string pubkey, StatisticsPeriod period);
}

public class PagedResult<T>
{
    public IEnumerable<T> Items { get; set; } = new List<T>();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class MatchFilter
{
    public int? Status { get; set; }
    public string? GameType { get; set; }    // NEW: filter by game type
    public string? GameMode { get; set; }    // Now string filter
    public string? MatchMode { get; set; }   // NEW: Team or DeathMatch
    public string? TeamSize { get; set; }    // RENAMED: from MatchType
    public bool? IsPrivate { get; set; }
}

public class Paging
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class MatchView
{
    public string MatchPda { get; set; } = string.Empty;
    public string CreatorPubkey { get; set; } = string.Empty; // Creator's public key
    public string GameType { get; set; } = string.Empty;      // NEW: PickHigher, Plinko, etc.
    public string GameMode { get; set; } = string.Empty;      // CHANGED: now string ("1x3", "3x9", "5x16")
    public string MatchMode { get; set; } = string.Empty;     // NEW: Team or DeathMatch
    public string TeamSize { get; set; } = string.Empty;      // RENAMED: from MatchType
    public long StakeLamports { get; set; }
    public string Status { get; set; } = string.Empty;
    public long DeadlineTs { get; set; }
    public int? WinnerSide { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? PendingAt { get; set; }
    public DateTime? GameStartTime { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public List<ParticipantView> Participants { get; set; } = new();
}

public class MatchDetails
{
    public string MatchPda { get; set; } = string.Empty;
    public string CreatorPubkey { get; set; } = string.Empty; // Creator's public key
    public string GameType { get; set; } = string.Empty;      // NEW: PickHigher, Plinko, etc.
    public string GameMode { get; set; } = string.Empty;      // CHANGED: now string ("1x3", "3x9", "5x16")
    public string MatchMode { get; set; } = string.Empty;     // NEW: Team or DeathMatch
    public string TeamSize { get; set; } = string.Empty;      // RENAMED: from MatchType
    public long StakeLamports { get; set; }
    public string Status { get; set; } = string.Empty;
    public long DeadlineTs { get; set; }
    public int? WinnerSide { get; set; }
    public string CreateTx { get; set; } = string.Empty;
    public string? JoinTx { get; set; }
    public string? PayoutTx { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? PendingAt { get; set; }
    public DateTime? GameStartTime { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public List<ParticipantView> Participants { get; set; } = new();
    public GameDataView? GameData { get; set; }
}

public class ParticipantView
{
    public string Pubkey { get; set; } = string.Empty;
    public string? Username { get; set; }
    public int Side { get; set; }
    public int Position { get; set; }
    public int? TargetScore { get; set; }
    public bool? IsWinner { get; set; }
}

public class GameDataView
{
    public string GameMode { get; set; } = string.Empty; // Now string: "1x3", "3x9", "5x16"
    public int Side0TotalScore { get; set; }
    public int Side1TotalScore { get; set; }
    public DateTime GeneratedAt { get; set; }
}

public class UserProfile
{
    public string Pubkey { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int Wins { get; set; }
    public int Losses { get; set; }
    public long TotalEarningsLamports { get; set; }
    public int MatchesPlayed { get; set; }
    public DateTime FirstSeen { get; set; }
    public DateTime LastSeen { get; set; }
    public DateTime? LastUsernameChange { get; set; }
    public bool CanChangeUsername { get; set; }
    public List<MatchView> RecentMatches { get; set; } = new();
}

public class LeaderboardResult
{
    public IEnumerable<LeaderboardEntry> Entries { get; set; } = new List<LeaderboardEntry>();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public LeaderboardType Type { get; set; }
    public LeaderboardPeriod Period { get; set; }
}

public class LeaderboardEntry
{
    public string Pubkey { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int Rank { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public int TotalMatches { get; set; }
    public double WinRate { get; set; }
    public long TotalEarningsLamports { get; set; }
    public long MonthlyEarningsLamports { get; set; }
}

public enum LeaderboardType
{
    WinRate = 0,        // Wins / Total Matches
    Earnings = 1,  // Earnings in lamports
}

public enum LeaderboardPeriod
{
    AllTime = 0,
    Monthly = 1
}

public class UserStatistics
{
    public int TotalMatches { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public double WinRate { get; set; }
    public long PnLDay { get; set; }
    public long PnLMonth { get; set; }
    public long PnLAllTime { get; set; }
}

public enum StatisticsPeriod
{
    Day = 0,
    Month = 1,
    AllTime = 2
}
