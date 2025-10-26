using Microsoft.EntityFrameworkCore;
using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.Context;
using SolanaPvP.EF_Core.DBOs;
using SolanaPvP.EF_Core.Mappers;

namespace SolanaPvP.EF_Core.Repositories;

public class EventRepository : IEventRepository
{
    private readonly SolanaPvPDbContext _context;

    public EventRepository(SolanaPvPDbContext context)
    {
        _context = context;
    }

    public async Task<Event> CreateAsync(Event eventEntity)
    {
        var dbo = eventEntity.ToDBO();
        _context.Events.Add(dbo);
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task<bool> ExistsBySignatureAsync(string signature)
    {
        return await _context.Events.AnyAsync(e => e.Signature == signature);
    }

    public async Task<long> GetLastProcessedSlotAsync()
    {
        var lastEvent = await _context.Events
            .OrderByDescending(e => e.Slot)
            .FirstOrDefaultAsync();

        return lastEvent?.Slot ?? 0;
    }

    public async Task SetLastProcessedSlotAsync(long slot)
    {
        // This could be stored in a separate IndexerState table
        // For now, we'll use the last event's slot as the cursor
        // In a real implementation, you might want a dedicated table for this
        await Task.CompletedTask;
    }
}
