using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;
using Microsoft.Extensions.Logging;
using Solnet.Rpc;

namespace SolanaPvP.SolanaRPC.Services;

public class SwitchboardClient : ISwitchboardClient
{
    private readonly SolanaSettings _solanaSettings;
    private readonly ILogger<SwitchboardClient> _logger;

    public SwitchboardClient(SolanaSettings solanaSettings, ILogger<SwitchboardClient> logger)
    {
        _solanaSettings = solanaSettings;
        _logger = logger;
    }

    public async Task<bool> IsRandomnessReadyAsync(string randomnessAccount)
    {
        try
        {
            _logger.LogDebug("[SwitchboardClient] Checking randomness readiness for {Account}", randomnessAccount);
            
            // Fetch account data from Solana
            var rpcClient = ClientFactory.GetClient(_solanaSettings.RpcPrimaryUrl);
            var accountInfo = await rpcClient.GetAccountInfoAsync(randomnessAccount);
            
            if (accountInfo == null || accountInfo.Result?.Value == null)
            {
                _logger.LogDebug("[SwitchboardClient] Account {Account} not found", randomnessAccount);
                return false;
            }

            var data = accountInfo.Result.Value.Data;
            if (data == null || data.Length < 16)
            {
                _logger.LogDebug("[SwitchboardClient] Account {Account} has insufficient data", randomnessAccount);
                return false;
            }

            // Check if account owner is Switchboard
            var expectedOwner = "BeFxPRDreo8uLivyGgqDE87iGaU3o1Tw9hZw46NxYaej"; // SWITCHBOARD_PROGRAM_ID
            if (accountInfo.Result.Value.Owner != expectedOwner)
            {
                _logger.LogWarning("[SwitchboardClient] Account {Account} is not owned by Switchboard (owner: {Owner})", 
                    randomnessAccount, accountInfo.Result.Value.Owner);
                return false;
            }

            // For MVP: if account exists and is owned by Switchboard, consider ready
            // In production: check specific flags/discriminator in account data
            _logger.LogDebug("[SwitchboardClient] Randomness ready for {Account}", randomnessAccount);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SwitchboardClient] Error checking randomness for {Account}", randomnessAccount);
            return false;
        }
    }

    public async Task<ulong?> ReadRandomnessValueAsync(string randomnessAccount)
    {
        try
        {
            _logger.LogDebug("[SwitchboardClient] Reading randomness value from {Account}", randomnessAccount);
            
            // Fetch account data
            var rpcClient = ClientFactory.GetClient(_solanaSettings.RpcPrimaryUrl);
            var accountInfo = await rpcClient.GetAccountInfoAsync(randomnessAccount);
            
            if (accountInfo == null || accountInfo.Result?.Value?.Data == null)
            {
                return null;
            }

            var data = accountInfo.Result.Value.Data;
            if (data.Length < 16)
            {
                return null;
            }

            // Read randomness value (bytes 8-16, as done in smart contract)
            var randomnessBytes = data[8..16];
            var randomnessValue = BitConverter.ToUInt64(randomnessBytes, 0);
            
            _logger.LogInformation("[SwitchboardClient] Read randomness value from {Account}: {Value}", 
                randomnessAccount, randomnessValue);
            
            return randomnessValue;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SwitchboardClient] Error reading randomness from {Account}", randomnessAccount);
            return null;
        }
    }
}

