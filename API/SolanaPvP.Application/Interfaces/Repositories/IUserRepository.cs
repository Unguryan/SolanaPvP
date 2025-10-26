using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByPubkeyAsync(string pubkey);
    Task<User> CreateOrUpdateAsync(User user);
    Task UpdateStatsAsync(string pubkey, bool isWinner, long earningsLamports);
}
