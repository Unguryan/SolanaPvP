using Microsoft.EntityFrameworkCore;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Domain.Models;
using SolanaPvP.Domain.Enums;
using SolanaPvP.EF_Core.Context;
using SolanaPvP.EF_Core.DBOs;
using SolanaPvP.EF_Core.Mappers;

namespace SolanaPvP.EF_Core.Repositories;

public class MatchRepository : IMatchRepository
{
    private readonly SolanaPvPDbContext _context;

    public MatchRepository(SolanaPvPDbContext context)
    {
        _context = context;
    }

    public async Task<Match?> GetByMatchPdaAsync(string matchPda)
    {
        var dbo = await _context.Matches
            .Include(m => m.Participants)
                .ThenInclude(p => p.User) // ← LOAD USER DATA FOR PARTICIPANTS!
            .Include(m => m.GameData)
            .FirstOrDefaultAsync(m => m.MatchPda == matchPda);

        return dbo?.ToDomain();
    }

    public async Task<IEnumerable<Match>> GetMatchesAsync(int? status = null, int skip = 0, int take = 50, bool? isPrivate = null)
    {
        var query = _context.Matches
            .Include(m => m.Participants)
                .ThenInclude(p => p.User) // ← LOAD USER DATA
            .Include(m => m.GameData)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(m => (int)m.Status == status.Value);
        }

        if (isPrivate.HasValue)
        {
            query = query.Where(m => m.IsPrivate == isPrivate.Value);
        }

        var dbos = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return dbos.Select(dbo => dbo.ToDomain());
    }

    public async Task<IEnumerable<Match>> GetActiveMatchesAsync(int skip = 0, int take = 50)
    {
        var activeStatuses = new[] { SolanaPvP.Domain.Enums.MatchStatus.Open, SolanaPvP.Domain.Enums.MatchStatus.Pending, SolanaPvP.Domain.Enums.MatchStatus.InProgress };
        
       var dbos = await _context.Matches
            .Include(m => m.Participants)
                .ThenInclude(p => p.User) // ← LOAD USER DATA
            .Include(m => m.GameData)
            .Where(m => activeStatuses.Contains(m.Status) && !m.IsPrivate)
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return dbos.Select(dbo => dbo.ToDomain());
    }

    public async Task<Match> CreateAsync(Match match)
    {
        var dbo = match.ToDBO();
        _context.Matches.Add(dbo);
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task<Match> UpdateAsync(Match match)
    {
        var dbo = match.ToDBO();
        
        // Detach any existing tracked entity with the same key
        var existingEntry = _context.ChangeTracker.Entries<MatchDBO>()
            .FirstOrDefault(e => e.Entity.MatchPda == dbo.MatchPda);
        
        if (existingEntry != null)
        {
            _context.Entry(existingEntry.Entity).State = EntityState.Detached;
        }
        
        _context.Matches.Update(dbo);
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task<bool> ExistsAsync(string matchPda)
    {
        return await _context.Matches.AnyAsync(m => m.MatchPda == matchPda);
    }

    public async Task<IEnumerable<Match>> GetUserMatchesAsync(string pubkey, int skip, int take)
    {
        var dbos = await _context.Matches
            .Include(m => m.Participants)
                .ThenInclude(p => p.User) // ← LOAD USER DATA
            .Include(m => m.GameData)
            .Where(m => m.Participants.Any(p => p.Pubkey == pubkey))
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return dbos.Select(dbo => dbo.ToDomain());
    }

    public async Task<int> GetUserMatchesCountAsync(string pubkey)
    {
        return await _context.Matches
            .Where(m => m.Participants.Any(p => p.Pubkey == pubkey))
            .CountAsync();
    }

    public async Task AddParticipantAsync(MatchParticipant participant)
    {
        var dbo = participant.ToDBO();
        _context.MatchParticipants.Add(dbo);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateParticipantAsync(MatchParticipant participant)
    {
        var dbo = participant.ToDBO();
        
        // Detach any existing tracked entity with the same key
        var existingEntry = _context.ChangeTracker.Entries<MatchParticipantDBO>()
            .FirstOrDefault(e => e.Entity.Id == dbo.Id);
        
        if (existingEntry != null)
        {
            _context.Entry(existingEntry.Entity).State = EntityState.Detached;
        }
        
        _context.MatchParticipants.Update(dbo);
        await _context.SaveChangesAsync();
    }
}
