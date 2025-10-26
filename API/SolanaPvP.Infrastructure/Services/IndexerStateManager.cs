using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.Infrastructure.Services;

public class IndexerStateManager : IIndexerStateManager
{
    private readonly IEventRepository _eventRepository;

    public IndexerStateManager(IEventRepository eventRepository)
    {
        _eventRepository = eventRepository;
    }

    public async Task<long> GetLastProcessedSlotAsync()
    {
        return await _eventRepository.GetLastProcessedSlotAsync();
    }

    public async Task SetLastProcessedSlotAsync(long slot)
    {
        await _eventRepository.SetLastProcessedSlotAsync(slot);
    }

    public async Task<string?> GetLastProcessedSignatureAsync()
    {
        // This is a simplified implementation
        // In a real scenario, you might want to store the last processed signature separately
        // For now, we'll use the last event's signature as a proxy
        var lastSlot = await GetLastProcessedSlotAsync();
        if (lastSlot == 0) return null;

        // This would need to be implemented properly with a dedicated method
        // For now, return null to indicate no specific signature tracking
        return null;
    }

    public async Task SetLastProcessedSignatureAsync(string signature)
    {
        // This is a simplified implementation
        // In a real scenario, you would store this separately
        await Task.CompletedTask;
    }
}
