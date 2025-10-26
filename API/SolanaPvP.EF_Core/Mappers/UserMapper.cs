using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.DBOs;

namespace SolanaPvP.EF_Core.Mappers;

public static class UserMapper
{
    public static User ToDomain(this UserDBO dbo)
    {
        return new User
        {
            Pubkey = dbo.Pubkey,
            Wins = dbo.Wins,
            Losses = dbo.Losses,
            TotalEarningsLamports = dbo.TotalEarningsLamports,
            MatchesPlayed = dbo.MatchesPlayed,
            FirstSeen = dbo.FirstSeen,
            LastSeen = dbo.LastSeen,
            MatchParticipants = dbo.MatchParticipants.Select(p => p.ToDomain()).ToList()
        };
    }

    public static UserDBO ToDBO(this User domain)
    {
        return new UserDBO
        {
            Pubkey = domain.Pubkey,
            Wins = domain.Wins,
            Losses = domain.Losses,
            TotalEarningsLamports = domain.TotalEarningsLamports,
            MatchesPlayed = domain.MatchesPlayed,
            FirstSeen = domain.FirstSeen,
            LastSeen = domain.LastSeen,
            MatchParticipants = domain.MatchParticipants.Select(p => p.ToDBO()).ToList()
        };
    }
}
