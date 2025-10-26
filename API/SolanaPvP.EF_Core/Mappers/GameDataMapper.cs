using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.DBOs;

namespace SolanaPvP.EF_Core.Mappers;

public static class GameDataMapper
{
    public static GameData ToDomain(this GameDataDBO dbo)
    {
        return new GameData
        {
            Id = dbo.Id,
            MatchPda = dbo.MatchPda,
            GameMode = dbo.GameMode,
            Side0TotalScore = dbo.Side0TotalScore,
            Side1TotalScore = dbo.Side1TotalScore,
            GeneratedAt = dbo.GeneratedAt
        };
    }

    public static GameDataDBO ToDBO(this GameData domain)
    {
        return new GameDataDBO
        {
            Id = domain.Id,
            MatchPda = domain.MatchPda,
            GameMode = domain.GameMode,
            Side0TotalScore = domain.Side0TotalScore,
            Side1TotalScore = domain.Side1TotalScore,
            GeneratedAt = domain.GeneratedAt
        };
    }
}
