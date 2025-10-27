using Microsoft.EntityFrameworkCore;
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
            .Include(m => m.GameData)
            .Include(m => m.Events)
            .FirstOrDefaultAsync(m => m.MatchPda == matchPda);

        return dbo?.ToDomain();
    }

    public async Task<IEnumerable<Match>> GetMatchesAsync(int? status = null, int skip = 0, int take = 50, bool? isPrivate = null)
    {
        var query = _context.Matches
            .Include(m => m.Participants)
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
        var activeStatuses = new[] { SolanaPvP.Domain.Enums.MatchStatus.Waiting, SolanaPvP.Domain.Enums.MatchStatus.AwaitingRandomness };
        
        var dbos = await _context.Matches
            .Include(m => m.Participants)
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
        _context.Matches.Update(dbo);
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task<bool> ExistsAsync(string matchPda)
    {
        return await _context.Matches.AnyAsync(m => m.MatchPda == matchPda);
    }
}
