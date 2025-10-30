using Microsoft.EntityFrameworkCore;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.Context;
using SolanaPvP.EF_Core.DBOs;
using SolanaPvP.EF_Core.Mappers;

namespace SolanaPvP.EF_Core.Repositories;

public class MatchInvitationRepository : IMatchInvitationRepository
{
    private readonly SolanaPvPDbContext _context;

    public MatchInvitationRepository(SolanaPvPDbContext context)
    {
        _context = context;
    }

    public async Task<MatchInvitation> CreateAsync(MatchInvitation invitation)
    {
        var dbo = invitation.ToDBO();
        _context.MatchInvitations.Add(dbo);
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task<MatchInvitation?> GetByIdAsync(int id)
    {
        var dbo = await _context.MatchInvitations
            .Include(i => i.Inviter)
            .Include(i => i.Invitee)
            .Include(i => i.Match)
            .FirstOrDefaultAsync(i => i.Id == id);

        return dbo?.ToDomain();
    }

    public async Task<MatchInvitation> UpdateAsync(MatchInvitation invitation)
    {
        var dbo = invitation.ToDBO();
        _context.MatchInvitations.Update(dbo);
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task<IEnumerable<MatchInvitation>> GetUserInvitationsAsync(string pubkey, int? status = null)
    {
        var query = _context.MatchInvitations
            .Include(i => i.Inviter)
            .Include(i => i.Invitee)
            .Where(i => i.InviterPubkey == pubkey || i.InviteePubkey == pubkey);

        if (status.HasValue)
        {
            query = query.Where(i => (int)i.Status == status.Value);
        }

        var dbos = await query
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return dbos.Select(dbo => dbo.ToDomain());
    }

    public async Task<IEnumerable<MatchInvitation>> GetExpiredInvitationsAsync()
    {
        var now = DateTime.UtcNow;
        var dbos = await _context.MatchInvitations
            .Where(i => i.ExpiresAt.HasValue && i.ExpiresAt.Value < now && i.Status == Domain.Enums.InvitationStatus.Pending)
            .ToListAsync();

        return dbos.Select(dbo => dbo.ToDomain());
    }
}
