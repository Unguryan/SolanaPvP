using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.Infrastructure.Services;

public class IndexerStateManager : IIndexerStateManager
{
    // Simple in-memory tracking since we removed Events table
    private long _lastProcessedSlot = 0;
    private string? _lastProcessedSignature = null;

    public Task<long> GetLastProcessedSlotAsync()
    {
        return Task.FromResult(_lastProcessedSlot);
    }

    public Task SetLastProcessedSlotAsync(long slot)
    {
        _lastProcessedSlot = slot;
        return Task.CompletedTask;
    }

    public Task<string?> GetLastProcessedSignatureAsync()
    {
        return Task.FromResult(_lastProcessedSignature);
    }

    public Task SetLastProcessedSignatureAsync(string signature)
    {
        _lastProcessedSignature = signature;
        return Task.CompletedTask;
    }
}
