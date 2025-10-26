namespace SolanaPvP.Application.Interfaces.Services;

public interface IUsernameService
{
    Task<bool> IsUsernameAvailableAsync(string username);
    Task<bool> ChangeUsernameAsync(string pubkey, string newUsername);
    Task<bool> CanChangeUsernameAsync(string pubkey);
    Task<string> GenerateUniqueUsernameAsync(string pubkey);
}
