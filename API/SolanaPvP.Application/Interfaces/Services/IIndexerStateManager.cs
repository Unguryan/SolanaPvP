namespace SolanaPvP.Application.Interfaces.Services;

public interface IIndexerStateManager
{
    Task<long> GetLastProcessedSlotAsync();
    Task SetLastProcessedSlotAsync(long slot);
    Task<string?> GetLastProcessedSignatureAsync();
    Task SetLastProcessedSignatureAsync(string signature);
}
