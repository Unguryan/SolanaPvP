using Newtonsoft.Json;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;
using SolanaPvP.SolanaRPC.Internal.Models;

namespace SolanaPvP.SolanaRPC.Services;

public class RpcReader : IRpcReader
{
    private readonly HttpClient _httpClient;
    private readonly SolanaSettings _solanaSettings;

    public RpcReader(HttpClient httpClient, SolanaSettings solanaSettings)
    {
        _httpClient = httpClient;
        _solanaSettings = solanaSettings;
    }

    public async Task<SolanaPvP.Application.Interfaces.SolanaRPC.RpcTransaction?> GetTransactionAsync(string signature)
    {
        try
        {
            var request = new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "getTransaction",
                @params = new object[]
                {
                    signature,
                    new
                    {
                        encoding = "json",
                        maxSupportedTransactionVersion = 0
                    }
                }
            };

            var response = await PostRpcRequestAsync(request);
            if (response?.result == null) return null;

            var result = response.result;
            return new SolanaPvP.Application.Interfaces.SolanaRPC.RpcTransaction
            {
                Signature = signature,
                Slot = result.slot ?? 0,
                Error = result.err?.ToString(),
                Message = result.transaction?.message != null ? new SolanaPvP.Application.Interfaces.SolanaRPC.RpcTransactionMessage
                {
                    AccountKeys = result.transaction.message.accountKeys?.ToObject<List<string>>() ?? new List<string>(),
                    Instructions = result.transaction.message.instructions?.ToObject<List<SolanaPvP.Application.Interfaces.SolanaRPC.RpcInstruction>>() ?? new List<SolanaPvP.Application.Interfaces.SolanaRPC.RpcInstruction>()
                } : null
            };
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<string>> GetSignaturesForAddressAsync(string address, int limit)
    {
        try
        {
            var request = new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "getSignaturesForAddress",
                @params = new object[]
                {
                    address,
                    new { limit }
                }
            };

            var response = await PostRpcRequestAsync(request);
            if (response?.result == null) return new List<string>();

            var signatures = response.result.ToObject<List<dynamic>>() ?? new List<dynamic>();
            var result = new List<string>();
            foreach (var s in signatures)
            {
                var signature = ((dynamic)s).signature?.ToString();
                if (!string.IsNullOrEmpty(signature))
                {
                    result.Add(signature);
                }
            }
            return result;
        }
        catch (Exception)
        {
            return new List<string>();
        }
    }

    public async Task<long> GetSlotAsync()
    {
        try
        {
            var request = new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "getSlot"
            };

            var response = await PostRpcRequestAsync(request);
            return response?.result?.ToObject<long>() ?? 0;
        }
        catch (Exception)
        {
            return 0;
        }
    }

    private async Task<dynamic?> PostRpcRequestAsync(object request)
    {
        var json = JsonConvert.SerializeObject(request);
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(_solanaSettings.RpcPrimaryUrl, content);
        if (!response.IsSuccessStatusCode) return null;

        var responseJson = await response.Content.ReadAsStringAsync();
        var rpcResponse = JsonConvert.DeserializeObject<dynamic>(responseJson);

        if (rpcResponse?.error != null)
        {
            // Try fallback URL if primary fails
            if (_solanaSettings.RpcPrimaryUrl != _solanaSettings.RpcFallbackUrl)
            {
                response = await _httpClient.PostAsync(_solanaSettings.RpcFallbackUrl, content);
                if (response.IsSuccessStatusCode)
                {
                    responseJson = await response.Content.ReadAsStringAsync();
                    rpcResponse = JsonConvert.DeserializeObject<dynamic>(responseJson);
                }
            }
        }

        return rpcResponse;
    }
}
