using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SolanaPvP.Domain.Settings;

namespace SolanaPvP.Application;

/// <summary>
/// Dependency injection configuration for the Application layer.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers Application services and domain settings.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure settings
        services.Configure<SolanaSettings>(configuration.GetSection("Solana"));
        services.Configure<IndexerSettings>(configuration.GetSection("Indexer"));
        services.Configure<RefundSettings>(configuration.GetSection("Refund"));
        services.Configure<CommissionSettings>(configuration.GetSection("Commission"));

        // Register settings as singletons for easy access
        services.AddSingleton<SolanaSettings>(provider =>
            configuration.GetSection("Solana").Get<SolanaSettings>() ?? new SolanaSettings());
        services.AddSingleton<IndexerSettings>(provider =>
            configuration.GetSection("Indexer").Get<IndexerSettings>() ?? new IndexerSettings());
        services.AddSingleton<RefundSettings>(provider =>
            configuration.GetSection("Refund").Get<RefundSettings>() ?? new RefundSettings());

        return services;
    }
}
