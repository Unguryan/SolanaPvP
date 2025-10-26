using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Repositories;

public interface IEventRepository
{
    Task<Event> CreateAsync(Event eventEntity);
    Task<bool> ExistsBySignatureAsync(string signature);
    Task<long> GetLastProcessedSlotAsync();
    Task SetLastProcessedSlotAsync(long slot);
}
