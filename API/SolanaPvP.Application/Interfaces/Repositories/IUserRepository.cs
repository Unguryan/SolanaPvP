using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByPubkeyAsync(string pubkey);
    Task<User?> GetByUsernameAsync(string username);
    Task<User> CreateOrUpdateAsync(User user);
    Task UpdateStatsAsync(string pubkey, bool isWinner, long earningsLamports);
    Task<bool> IsUsernameAvailableAsync(string username);
    Task<bool> ChangeUsernameAsync(string pubkey, string newUsername);
    Task<bool> CanChangeUsernameAsync(string pubkey);
    Task<IEnumerable<User>> GetAllUsersAsync();
}
