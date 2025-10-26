using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.Infrastructure.Services;

public class UsernameService : IUsernameService
{
    private readonly IUserRepository _userRepository;

    public UsernameService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<bool> IsUsernameAvailableAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username) || username.Length < 3 || username.Length > 50)
        {
            return false;
        }

        // Check for valid characters (alphanumeric and underscore only)
        if (!username.All(c => char.IsLetterOrDigit(c) || c == '_'))
        {
            return false;
        }

        return await _userRepository.IsUsernameAvailableAsync(username);
    }

    public async Task<bool> ChangeUsernameAsync(string pubkey, string newUsername)
    {
        if (!await IsUsernameAvailableAsync(newUsername))
        {
            return false;
        }

        if (!await CanChangeUsernameAsync(pubkey))
        {
            return false;
        }

        return await _userRepository.ChangeUsernameAsync(pubkey, newUsername);
    }

    public async Task<bool> CanChangeUsernameAsync(string pubkey)
    {
        return await _userRepository.CanChangeUsernameAsync(pubkey);
    }

    public async Task<string> GenerateUniqueUsernameAsync(string pubkey)
    {
        // Generate a username based on the pubkey (first 8 characters)
        var baseUsername = $"player_{pubkey[..8]}";
        var username = baseUsername;
        var counter = 1;

        while (!await IsUsernameAvailableAsync(username))
        {
            username = $"{baseUsername}_{counter}";
            counter++;
        }

        return username;
    }
}
