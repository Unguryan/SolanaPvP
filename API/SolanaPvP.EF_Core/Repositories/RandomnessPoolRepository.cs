using Microsoft.EntityFrameworkCore;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.Context;
using SolanaPvP.EF_Core.DBOs;
using SolanaPvP.EF_Core.Mappers;

namespace SolanaPvP.EF_Core.Repositories;

public class RandomnessPoolRepository : IRandomnessPoolRepository
{
    private readonly SolanaPvPDbContext _context;

    public RandomnessPoolRepository(SolanaPvPDbContext context)
    {
        _context = context;
    }

    public async Task<RandomnessPoolAccount?> GetAvailableAccountAsync()
    {
        var dbo = await _context.RandomnessPool
            .Where(r => r.Status == (int)RandomnessAccountStatus.Available)
            .OrderBy(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        return dbo?.ToDomain();
    }

    public async Task<RandomnessPoolAccount?> GetAccountAsync(string pubkey)
    {
        var dbo = await _context.RandomnessPool
            .FirstOrDefaultAsync(r => r.AccountPubkey == pubkey);

        return dbo?.ToDomain();
    }

    public async Task<RandomnessPoolAccount> CreateAsync(RandomnessPoolAccount account)
    {
        var dbo = account.ToDBO();
        _context.RandomnessPool.Add(dbo);
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task<RandomnessPoolAccount> UpdateStatusAsync(string pubkey, RandomnessAccountStatus status)
    {
        var dbo = await _context.RandomnessPool.FindAsync(pubkey);
        if (dbo == null)
            throw new InvalidOperationException($"Randomness account {pubkey} not found");

        dbo.Status = (int)status;
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task MarkInUseAsync(string pubkey)
    {
        var dbo = await _context.RandomnessPool.FindAsync(pubkey);
        if (dbo == null)
            throw new InvalidOperationException($"Randomness account {pubkey} not found");

        dbo.Status = (int)RandomnessAccountStatus.InUse;
        dbo.LastUsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task MarkCooldownAsync(string pubkey, int cooldownMinutes)
    {
        var dbo = await _context.RandomnessPool.FindAsync(pubkey);
        if (dbo == null)
            throw new InvalidOperationException($"Randomness account {pubkey} not found");

        dbo.Status = (int)RandomnessAccountStatus.Cooldown;
        dbo.CooldownUntil = DateTime.UtcNow.AddMinutes(cooldownMinutes);
        await _context.SaveChangesAsync();
    }

    public async Task<List<RandomnessPoolAccount>> GetCooldownExpiredAccountsAsync()
    {
        var now = DateTime.UtcNow;
        var dbos = await _context.RandomnessPool
            .Where(r => r.Status == (int)RandomnessAccountStatus.Cooldown 
                     && r.CooldownUntil <= now)
            .ToListAsync();

        return dbos.Select(d => d.ToDomain()).ToList();
    }

    public async Task<int> GetCountByStatusAsync(RandomnessAccountStatus status)
    {
        return await _context.RandomnessPool
            .Where(r => r.Status == (int)status)
            .CountAsync();
    }

    public async Task<int> GetTotalCountAsync()
    {
        return await _context.RandomnessPool.CountAsync();
    }
}

