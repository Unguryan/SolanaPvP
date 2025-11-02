using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Repositories;

public interface IRandomnessPoolRepository
{
    Task<RandomnessPoolAccount?> GetAvailableAccountAsync();
    Task<RandomnessPoolAccount?> GetAccountAsync(string pubkey);
    Task<RandomnessPoolAccount> CreateAsync(RandomnessPoolAccount account);
    Task<RandomnessPoolAccount> UpdateStatusAsync(string pubkey, RandomnessAccountStatus status);
    Task MarkInUseAsync(string pubkey);
    Task MarkCooldownAsync(string pubkey, int cooldownMinutes);
    Task<List<RandomnessPoolAccount>> GetCooldownExpiredAccountsAsync();
    Task<int> GetCountByStatusAsync(RandomnessAccountStatus status);
    Task<int> GetTotalCountAsync();
}

