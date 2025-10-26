namespace SolanaPvP.API_Project.Middleware;

public class PubkeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PubkeyMiddleware> _logger;

    public PubkeyMiddleware(RequestDelegate next, ILogger<PubkeyMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Extract pubkey from headers
        var pubkey = ExtractPubkeyFromHeaders(context.Request);

        if (!string.IsNullOrEmpty(pubkey))
        {
            // Validate pubkey format (basic validation)
            if (IsValidPubkey(pubkey))
            {
                // Store in HttpContext.Items for easy access
                context.Items["UserPubkey"] = pubkey;
                _logger.LogDebug("User pubkey extracted: {Pubkey}", pubkey);
            }
            else
            {
                _logger.LogWarning("Invalid pubkey format: {Pubkey}", pubkey);
            }
        }

        await _next(context);
    }

    private string? ExtractPubkeyFromHeaders(HttpRequest request)
    {
        // Try different header names in order of preference
        var headerNames = new[]
        {
            "X-User-Pubkey",     // Custom header
            "X-Pubkey",          // Shorter version
            "User-Pubkey",       // Alternative
            "Pubkey"             // Simple version
        };

        foreach (var headerName in headerNames)
        {
            if (request.Headers.TryGetValue(headerName, out var headerValue))
            {
                var pubkey = headerValue.FirstOrDefault();
                if (!string.IsNullOrEmpty(pubkey))
                {
                    return pubkey.Trim();
                }
            }
        }

        return null;
    }

    private bool IsValidPubkey(string pubkey)
    {
        // Basic validation for Solana pubkey format
        // Solana pubkeys are base58 encoded and typically 32-44 characters
        if (string.IsNullOrWhiteSpace(pubkey))
            return false;

        if (pubkey.Length < 32 || pubkey.Length > 44)
            return false;

        // Check if it contains only valid base58 characters
        var validChars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        return pubkey.All(c => validChars.Contains(c));
    }
}
