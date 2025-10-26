namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface IRpcReader
{
    Task<RpcTransaction?> GetTransactionAsync(string signature);
    Task<IReadOnlyList<string>> GetSignaturesForAddressAsync(string address, int limit);
    Task<long> GetSlotAsync();
}

public class RpcTransaction
{
    public string Signature { get; set; } = string.Empty;
    public long Slot { get; set; }
    public string? Error { get; set; }
    public RpcTransactionMessage? Message { get; set; }
}

public class RpcTransactionMessage
{
    public List<string> AccountKeys { get; set; } = new();
    public List<RpcInstruction> Instructions { get; set; } = new();
}

public class RpcInstruction
{
    public int ProgramIdIndex { get; set; }
    public List<int> Accounts { get; set; } = new();
    public string Data { get; set; } = string.Empty;
}
