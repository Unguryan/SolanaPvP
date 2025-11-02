using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.EF_Core.Context;
using SolanaPvP.EF_Core.Repositories;

namespace SolanaPvP.EF_Core;

/// <summary>
/// Dependency injection configuration for the EF Core data access layer.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers EF Core services and repositories.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddEfCore(this IServiceCollection services, IConfiguration configuration)
    {
        // Add Entity Framework
        services.AddDbContext<SolanaPvPDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        // Register repositories
        services.AddScoped<IMatchRepository, MatchRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefundTaskRepository, RefundTaskRepository>();
        services.AddScoped<IMatchInvitationRepository, MatchInvitationRepository>();

        return services;
    }
}
