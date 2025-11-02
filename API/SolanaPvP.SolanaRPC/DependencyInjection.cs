using Microsoft.Extensions.DependencyInjection;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.SolanaRPC.Services;

namespace SolanaPvP.SolanaRPC;

/// <summary>
/// Dependency injection configuration for the SolanaRPC layer.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers SolanaRPC services.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddSolanaRPC(this IServiceCollection services)
    {
        // Add HTTP client for RPC calls
        services.AddHttpClient<IRpcReader, RpcReader>();

        // Register SolanaRPC services
        services.AddScoped<IEventParser, EventParser>();
        services.AddScoped<ITxVerifier, TxVerifier>();
        services.AddScoped<NodeScriptExecutor>(); // Shared Node.js script executor
        services.AddScoped<IRefundSender, RefundSender>();
        services.AddScoped<IResolveSender, ResolveSender>();
        services.AddScoped<ISwitchboardClient, SwitchboardClient>();
        services.AddSingleton<IWsSubscriber, WsSubscriber>();

        return services;
    }
}
