using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;
using SolanaPvP.SolanaRPC.Internal;

namespace SolanaPvP.SolanaRPC.Services;

public class SwitchboardApiClient : ISwitchboardApiClient
{
    private readonly NodeScriptExecutor _scriptExecutor;
    private readonly SolanaSettings _solanaSettings;
    private readonly SwitchboardSettings _switchboardSettings;
    private readonly ILogger<SwitchboardApiClient> _logger;

    public SwitchboardApiClient(
        NodeScriptExecutor scriptExecutor,
        IOptions<SolanaSettings> solanaSettings,
        IOptions<SwitchboardSettings> switchboardSettings,
        ILogger<SwitchboardApiClient> logger)
    {
        _scriptExecutor = scriptExecutor;
        _solanaSettings = solanaSettings.Value;
        _switchboardSettings = switchboardSettings.Value;
        _logger = logger;
    }

    public async Task<string> CreateRandomnessAccountAsync()
    {
        _logger.LogInformation("[SwitchboardApi] Creating randomness account");

        try
        {
            var result = await _scriptExecutor.ExecuteAsync(
                "create-randomness-account.js",
                _switchboardSettings.QueuePubkey,
                _solanaSettings.AdminKeypairPath,
                _solanaSettings.RpcPrimaryUrl
            );

            if (string.IsNullOrWhiteSpace(result))
            {
                throw new InvalidOperationException("Failed to create randomness account: empty response");
            }

            _logger.LogInformation("[SwitchboardApi] Randomness account created: {Account}", result);
            return result.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SwitchboardApi] Failed to create randomness account");
            throw;
        }
    }

    public async Task<bool> CommitRandomnessAsync(string accountPubkey)
    {
        _logger.LogInformation("[SwitchboardApi] Committing randomness for {Account}", accountPubkey);

        try
        {
            var result = await _scriptExecutor.ExecuteAsync(
                "commit-randomness.js",
                accountPubkey,
                _switchboardSettings.QueuePubkey,
                _solanaSettings.AdminKeypairPath,
                _solanaSettings.RpcPrimaryUrl
            );

            if (string.IsNullOrWhiteSpace(result))
            {
                _logger.LogWarning("[SwitchboardApi] Commit randomness returned empty response");
                return false;
            }

            _logger.LogInformation("[SwitchboardApi] Randomness committed: {Tx}", result.Trim());
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SwitchboardApi] Failed to commit randomness for {Account}", accountPubkey);
            return false;
        }
    }

    public Task<bool> IsRandomnessReadyAsync(string accountPubkey)
    {
        // This is already implemented in SwitchboardClient.cs
        // We'll delegate to it or keep this as a wrapper
        // For now, returning false as placeholder - will be implemented via SwitchboardClient
        throw new NotImplementedException("Use ISwitchboardClient.IsRandomnessReadyAsync instead");
    }
}

