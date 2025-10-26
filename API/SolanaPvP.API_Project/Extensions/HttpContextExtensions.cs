namespace SolanaPvP.API_Project.Extensions;

public static class HttpContextExtensions
{
    private const string UserPubkeyKey = "UserPubkey";

    /// <summary>
    /// Gets the user's pubkey from the request headers (set by PubkeyMiddleware)
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>The user's pubkey if found, null otherwise</returns>
    public static string? GetUserPubkey(this HttpContext context)
    {
        return context.Items.TryGetValue(UserPubkeyKey, out var pubkey) 
            ? pubkey as string 
            : null;
    }

    /// <summary>
    /// Gets the user's pubkey from the request headers, throwing an exception if not found
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>The user's pubkey</returns>
    /// <exception cref="UnauthorizedAccessException">Thrown when pubkey is not found in headers</exception>
    public static string GetRequiredUserPubkey(this HttpContext context)
    {
        var pubkey = context.GetUserPubkey();
        if (string.IsNullOrEmpty(pubkey))
        {
            throw new UnauthorizedAccessException("User pubkey is required but not found in request headers. Please include 'X-User-Pubkey' header.");
        }
        return pubkey;
    }

    /// <summary>
    /// Checks if the current request has a valid user pubkey
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>True if pubkey is present and valid, false otherwise</returns>
    public static bool HasUserPubkey(this HttpContext context)
    {
        return !string.IsNullOrEmpty(context.GetUserPubkey());
    }
}
