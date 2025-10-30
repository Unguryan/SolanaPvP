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
            Username = dbo.Username,
            Wins = dbo.Wins,
            Losses = dbo.Losses,
            TotalEarningsLamports = dbo.TotalEarningsLamports,
            MatchesPlayed = dbo.MatchesPlayed,
            FirstSeen = dbo.FirstSeen,
            LastSeen = dbo.LastSeen,
            LastUsernameChange = dbo.LastUsernameChange,
            CanChangeUsername = dbo.CanChangeUsername,
            MatchParticipants = dbo.MatchParticipants.Select(p => p.ToDomain()).ToList(),
            SentInvitations = dbo.SentInvitations.Select(i => i.ToDomain()).ToList(),
            ReceivedInvitations = dbo.ReceivedInvitations.Select(i => i.ToDomain()).ToList()
        };
    }

    public static UserDBO ToDBO(this User domain)
    {
        return new UserDBO
        {
            Pubkey = domain.Pubkey,
            Username = domain.Username,
            Wins = domain.Wins,
            Losses = domain.Losses,
            TotalEarningsLamports = domain.TotalEarningsLamports,
            MatchesPlayed = domain.MatchesPlayed,
            FirstSeen = domain.FirstSeen,
            LastSeen = domain.LastSeen,
            LastUsernameChange = domain.LastUsernameChange,
            CanChangeUsername = domain.CanChangeUsername,
            MatchParticipants = domain.MatchParticipants.Select(p => p.ToDBO()).ToList(),
            SentInvitations = domain.SentInvitations.Select(i => i.ToDBO()).ToList(),
            ReceivedInvitations = domain.ReceivedInvitations.Select(i => i.ToDBO()).ToList()
        };
    }
}
