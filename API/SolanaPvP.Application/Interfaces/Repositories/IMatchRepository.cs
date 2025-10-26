using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Repositories;

public interface IMatchRepository
{
    Task<Match?> GetByMatchPdaAsync(string matchPda);
    Task<IEnumerable<Match>> GetMatchesAsync(int? status = null, int skip = 0, int take = 50);
    Task<Match> CreateAsync(Match match);
    Task<Match> UpdateAsync(Match match);
    Task<bool> ExistsAsync(string matchPda);
}
