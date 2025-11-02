using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;

namespace SolanaPvP.Infrastructure.Services;

public class MatchService : IMatchService
{
    private readonly IMatchRepository _matchRepository;
    private readonly IUserRepository _userRepository;

    public MatchService(IMatchRepository matchRepository, IUserRepository userRepository)
    {
        _matchRepository = matchRepository;
        _userRepository = userRepository;
    }

    public async Task<PagedResult<MatchView>> GetMatchesAsync(MatchFilter filter, Paging paging)
    {
        var skip = (paging.Page - 1) * paging.PageSize;
        var matches = await _matchRepository.GetMatchesAsync(filter.Status, skip, paging.PageSize, filter.IsPrivate);
        
        var total = await GetTotalMatchesCountAsync(filter);
        
        var matchViews = matches.Select(ConvertToMatchView).ToList();

        return new PagedResult<MatchView>
        {
            Items = matchViews,
            Total = total,
            Page = paging.Page,
            PageSize = paging.PageSize
        };
    }

    public async Task<PagedResult<MatchView>> GetActiveMatchesAsync(Paging paging)
    {
        var skip = (paging.Page - 1) * paging.PageSize;
        var matches = await _matchRepository.GetActiveMatchesAsync(skip, paging.PageSize);
        
        var total = await GetTotalActiveMatchesCountAsync();
        
        var matchViews = matches.Select(ConvertToMatchView).ToList();

        return new PagedResult<MatchView>
        {
            Items = matchViews,
            Total = total,
            Page = paging.Page,
            PageSize = paging.PageSize
        };
    }

    public async Task<MatchDetails?> GetMatchAsync(string matchPda)
    {
        var match = await _matchRepository.GetByMatchPdaAsync(matchPda);
        if (match == null) return null;

        return ConvertToMatchDetails(match);
    }

    public async Task<UserProfile?> GetUserAsync(string pubkey)
    {
        var user = await _userRepository.GetByPubkeyAsync(pubkey);
        if (user == null) return null;

        // Get recent matches for this user
        var recentMatches = await GetUserRecentMatchesAsync(pubkey, 10);

        return new UserProfile
        {
            Pubkey = user.Pubkey,
            Username = user.Username,
            Wins = user.Wins,
            Losses = user.Losses,
            TotalEarningsLamports = user.TotalEarningsLamports,
            MatchesPlayed = user.MatchesPlayed,
            FirstSeen = user.FirstSeen,
            LastSeen = user.LastSeen,
            LastUsernameChange = user.LastUsernameChange,
            CanChangeUsername = await _userRepository.CanChangeUsernameAsync(pubkey),
            RecentMatches = recentMatches
        };
    }

    public async Task<UserProfile?> GetUserByUsernameAsync(string username)
    {
        var user = await _userRepository.GetByUsernameAsync(username);
        if (user == null) return null;

        // Get recent matches for this user
        var recentMatches = await GetUserRecentMatchesAsync(user.Pubkey, 10);

        return new UserProfile
        {
            Pubkey = user.Pubkey,
            Username = user.Username,
            Wins = user.Wins,
            Losses = user.Losses,
            TotalEarningsLamports = user.TotalEarningsLamports,
            MatchesPlayed = user.MatchesPlayed,
            FirstSeen = user.FirstSeen,
            LastSeen = user.LastSeen,
            LastUsernameChange = user.LastUsernameChange,
            CanChangeUsername = await _userRepository.CanChangeUsernameAsync(user.Pubkey),
            RecentMatches = recentMatches
        };
    }

    public async Task<LeaderboardResult> GetLeaderboardAsync(LeaderboardType type, LeaderboardPeriod period, Paging paging)
    {
        var skip = (paging.Page - 1) * paging.PageSize;
        
        // This is a simplified implementation - in a real scenario, you'd want to optimize these queries
        var users = await _userRepository.GetAllUsersAsync();
        
        var leaderboardEntries = users
            .Select(u => new LeaderboardEntry
            {
                Pubkey = u.Pubkey,
                Username = u.Username,
                Wins = u.Wins,
                Losses = u.Losses,
                TotalMatches = u.MatchesPlayed,
                WinRate = u.MatchesPlayed > 0 ? (double)u.Wins / u.MatchesPlayed : 0,
                TotalEarningsLamports = u.TotalEarningsLamports,
                MonthlyEarningsLamports = GetMonthlyEarnings(u) // This would need proper implementation
            })
            .Where(e => e.TotalMatches > 0) // Only include users who have played matches
            .ToList();

        // Sort based on leaderboard type
        leaderboardEntries = type switch
        {
            LeaderboardType.WinRate => leaderboardEntries.OrderByDescending(e => e.WinRate).ThenByDescending(e => e.TotalMatches).ToList(),
            LeaderboardType.Earnings => leaderboardEntries.OrderByDescending(e => e.TotalEarningsLamports).ToList(),
            _ => leaderboardEntries.OrderByDescending(e => e.WinRate).ToList()
        };

        // Add ranks
        for (int i = 0; i < leaderboardEntries.Count; i++)
        {
            leaderboardEntries[i].Rank = i + 1;
        }

        var pagedEntries = leaderboardEntries.Skip(skip).Take(paging.PageSize).ToList();

        return new LeaderboardResult
        {
            Entries = pagedEntries,
            Total = leaderboardEntries.Count,
            Page = paging.Page,
            PageSize = paging.PageSize,
            Type = type,
            Period = period
        };
    }

    private async Task<int> GetTotalMatchesCountAsync(MatchFilter filter)
    {
        // This is a simplified implementation
        // In a real scenario, you might want to add a Count method to the repository
        var allMatches = await _matchRepository.GetMatchesAsync(filter.Status, 0, int.MaxValue, filter.IsPrivate);
        return allMatches.Count();
    }

    private async Task<int> GetTotalActiveMatchesCountAsync()
    {
        var allActiveMatches = await _matchRepository.GetActiveMatchesAsync(0, int.MaxValue);
        return allActiveMatches.Count();
    }

    private long GetMonthlyEarnings(User user)
    {
        // This is a placeholder - in a real implementation, you'd calculate monthly earnings
        // based on match results from the current month
        return user.TotalEarningsLamports / 12; // Simplified: divide total by 12
    }

    private async Task<List<MatchView>> GetUserRecentMatchesAsync(string pubkey, int limit)
    {
        var allMatches = await _matchRepository.GetMatchesAsync(null, 0, 1000);
        var userMatches = allMatches
            .Where(m => m.Participants.Any(p => p.Pubkey == pubkey))
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .Select(ConvertToMatchView)
            .ToList();

        return userMatches;
    }

    private MatchView ConvertToMatchView(Match match)
    {
        return new MatchView
        {
            MatchPda = match.MatchPda,
            GameMode = match.GameMode.ToString(),
            MatchType = match.MatchType.ToString(),
            StakeLamports = match.StakeLamports,
            Status = match.Status.ToString(),
            DeadlineTs = match.DeadlineTs,
            WinnerSide = match.WinnerSide,
            CreatedAt = match.CreatedAt,
            JoinedAt = match.JoinedAt,
            ResolvedAt = match.ResolvedAt,
            Participants = match.Participants.Select(ConvertToParticipantView).ToList()
        };
    }

    private MatchDetails ConvertToMatchDetails(Match match)
    {
        return new MatchDetails
        {
            MatchPda = match.MatchPda,
            GameMode = match.GameMode.ToString(),
            MatchType = match.MatchType.ToString(),
            StakeLamports = match.StakeLamports,
            Status = match.Status.ToString(),
            DeadlineTs = match.DeadlineTs,
            WinnerSide = match.WinnerSide,
            CreateTx = match.CreateTx,
            JoinTx = match.JoinTx,
            PayoutTx = match.PayoutTx,
            CreatedAt = match.CreatedAt,
            JoinedAt = match.JoinedAt,
            ResolvedAt = match.ResolvedAt,
            Participants = match.Participants.Select(ConvertToParticipantView).ToList(),
            GameData = match.GameData != null ? new GameDataView
            {
                GameMode = match.GameData.GameMode.ToString(),
                Side0TotalScore = match.GameData.Side0TotalScore,
                Side1TotalScore = match.GameData.Side1TotalScore,
                GeneratedAt = match.GameData.GeneratedAt
            } : null
        };
    }

    private ParticipantView ConvertToParticipantView(MatchParticipant participant)
    {
        return new ParticipantView
        {
            Pubkey = participant.Pubkey,
            Side = participant.Side,
            Position = participant.Position,
            TargetScore = participant.TargetScore,
            IsWinner = participant.IsWinner
        };
    }

    public async Task<UserProfile> CreateUserAsync(string pubkey)
    {
        // Generate a unique username
        var username = await GenerateUniqueUsernameAsync();
        
        // Create new user
        var user = new User
        {
            Pubkey = pubkey,
            Username = username,
            FirstSeen = DateTime.UtcNow,
            LastSeen = DateTime.UtcNow,
            CanChangeUsername = true
        };

        await _userRepository.CreateUserAsync(user);

        return new UserProfile
        {
            Pubkey = user.Pubkey,
            Username = user.Username,
            Wins = 0,
            Losses = 0,
            TotalEarningsLamports = 0,
            MatchesPlayed = 0,
            FirstSeen = user.FirstSeen,
            LastSeen = user.LastSeen,
            LastUsernameChange = user.LastUsernameChange,
            CanChangeUsername = user.CanChangeUsername,
            RecentMatches = new List<MatchView>()
        };
    }

    private async Task<string> GenerateUniqueUsernameAsync()
    {
        var random = new Random();
        string username;
        bool isUnique;
        
        do
        {
            var number = random.Next(1, 999999);
            username = $"user_{number}";
            isUnique = await _userRepository.IsUsernameAvailableAsync(username);
        } while (!isUnique);

        return username;
    }

    public async Task<PagedResult<MatchView>> GetUserMatchesAsync(string pubkey, Paging paging)
    {
        var skip = (paging.Page - 1) * paging.PageSize;
        var matches = await _matchRepository.GetUserMatchesAsync(pubkey, skip, paging.PageSize);
        var total = await _matchRepository.GetUserMatchesCountAsync(pubkey);
        
        var matchViews = matches.Select(ConvertToMatchView).ToList();

        return new PagedResult<MatchView>
        {
            Items = matchViews,
            Total = total,
            Page = paging.Page,
            PageSize = paging.PageSize
        };
    }

    public async Task<UserStatistics?> GetUserStatisticsAsync(string pubkey, StatisticsPeriod period)
    {
        var user = await _userRepository.GetByPubkeyAsync(pubkey);
        if (user == null) return null;

        var now = DateTime.UtcNow;
        var startOfDay = now.Date;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        // Get all user matches for PnL calculations
        var allMatches = await _matchRepository.GetUserMatchesAsync(pubkey, 0, int.MaxValue);
        
        // Calculate PnL for different periods
        var pnlDay = CalculatePnLForPeriod(allMatches, startOfDay, now);
        var pnlMonth = CalculatePnLForPeriod(allMatches, startOfMonth, now);
        var pnlAllTime = user.TotalEarningsLamports;

        return new UserStatistics
        {
            TotalMatches = user.MatchesPlayed,
            Wins = user.Wins,
            Losses = user.Losses,
            WinRate = user.MatchesPlayed > 0 ? (double)user.Wins / user.MatchesPlayed : 0,
            PnLDay = pnlDay,
            PnLMonth = pnlMonth,
            PnLAllTime = pnlAllTime
        };
    }

    private long CalculatePnLForPeriod(IEnumerable<Match> matches, DateTime startDate, DateTime endDate)
    {
        return matches
            .Where(m => m.ResolvedAt.HasValue && m.ResolvedAt.Value >= startDate && m.ResolvedAt.Value <= endDate)
            .Sum(m => CalculateMatchPnL(m));
    }

    private long CalculateMatchPnL(Match match)
    {
        if (!match.ResolvedAt.HasValue || match.WinnerSide == null) return 0;

        // Find the user's participant
        var userParticipant = match.Participants.FirstOrDefault(p => p.Pubkey == match.Participants.First().Pubkey);
        if (userParticipant == null || !userParticipant.IsWinner.HasValue) return 0;

        // If user won, they get the stake back plus opponent's stake
        // If user lost, they lose their stake
        return userParticipant.IsWinner.Value ? match.StakeLamports : -match.StakeLamports;
    }
}
