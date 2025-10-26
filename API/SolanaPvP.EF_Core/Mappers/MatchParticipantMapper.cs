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
            IsWinner = dbo.IsWinner
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
