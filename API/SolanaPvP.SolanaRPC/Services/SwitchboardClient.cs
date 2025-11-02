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

            // Data is returned as [base64_string, "base64"]
            var dataArray = accountInfo.Result.Value.Data;
            if (dataArray == null || dataArray.Count == 0)
            {
                _logger.LogDebug("[SwitchboardClient] Account {Account} has no data", randomnessAccount);
                return false;
            }

            // Decode base64 data
            byte[] decodedData;
            try
            {
                var base64String = dataArray[0];
                decodedData = Convert.FromBase64String(base64String);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SwitchboardClient] Failed to decode account data for {Account}", randomnessAccount);
                return false;
            }

            if (decodedData.Length < 16)
            {
                _logger.LogDebug("[SwitchboardClient] Account {Account} has insufficient data (need 16+ bytes, got {Length})", 
                    randomnessAccount, decodedData.Length);
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
            _logger.LogDebug("[SwitchboardClient] Randomness ready for {Account} ({Length} bytes)", 
                randomnessAccount, decodedData.Length);
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

            // Data is returned as [base64_string, "base64"]
            var dataArray = accountInfo.Result.Value.Data;
            if (dataArray.Count == 0)
            {
                return null;
            }

            // Decode base64 data
            byte[] decodedData;
            try
            {
                var base64String = dataArray[0];
                decodedData = Convert.FromBase64String(base64String);
            }
            catch
            {
                return null;
            }

            if (decodedData.Length < 16)
            {
                return null;
            }

            // Read randomness value (bytes 8-16, as done in smart contract)
            var randomnessBytes = decodedData[8..16];
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

