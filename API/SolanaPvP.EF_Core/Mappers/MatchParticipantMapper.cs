using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.DBOs;

namespace SolanaPvP.EF_Core.Mappers;

public static class MatchParticipantMapper
{
    public static MatchParticipant ToDomain(this MatchParticipantDBO dbo)
    {
        return new MatchParticipant
        {
            Id = dbo.Id,
            MatchPda = dbo.MatchPda,
            Pubkey = dbo.Pubkey,
            Side = dbo.Side,
            Position = dbo.Position,
            TargetScore = dbo.TargetScore,
            IsWinner = dbo.IsWinner,
            // Copy User without circular navigation properties
            User = dbo.User != null ? new User
            {
                Pubkey = dbo.User.Pubkey,
                Username = dbo.User.Username,
                Wins = dbo.User.Wins,
                Losses = dbo.User.Losses,
                TotalEarningsLamports = dbo.User.TotalEarningsLamports,
                MatchesPlayed = dbo.User.MatchesPlayed,
                FirstSeen = dbo.User.FirstSeen,
                LastSeen = dbo.User.LastSeen,
                LastUsernameChange = dbo.User.LastUsernameChange,
                CanChangeUsername = dbo.User.CanChangeUsername,
                MatchParticipants = new List<MatchParticipant>(), // Empty to avoid circular reference
                SentInvitations = new List<MatchInvitation>(),
                ReceivedInvitations = new List<MatchInvitation>()
            } : null!
        };
    }

    public static MatchParticipantDBO ToDBO(this MatchParticipant domain)
    {
        return new MatchParticipantDBO
        {
            Id = domain.Id,
            MatchPda = domain.MatchPda,
            Pubkey = domain.Pubkey,
            Side = domain.Side,
            Position = domain.Position,
            TargetScore = domain.TargetScore,
            IsWinner = domain.IsWinner
        };
    }
}
