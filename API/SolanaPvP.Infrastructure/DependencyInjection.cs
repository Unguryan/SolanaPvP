using Microsoft.Extensions.DependencyInjection;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Infrastructure.Services;

namespace SolanaPvP.Infrastructure;

/// <summary>
/// Dependency injection configuration for the Infrastructure layer.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers Infrastructure services.
    /// Note: This layer only registers service implementations.
    /// Repositories are registered in the EF_Core layer.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Register infrastructure service implementations
        services.AddScoped<IMatchService, MatchService>();
        services.AddScoped<IGameDataGenerator, GameDataGenerator>();
        services.AddScoped<IRefundScheduler, RefundScheduler>();
        services.AddScoped<IIndexerStateManager, IndexerStateManager>();
        services.AddScoped<IUsernameService, UsernameService>();
        services.AddScoped<IInvitationService, InvitationService>();
        services.AddScoped<IRandomnessPoolService, RandomnessPoolService>();

        return services;
    }
}
