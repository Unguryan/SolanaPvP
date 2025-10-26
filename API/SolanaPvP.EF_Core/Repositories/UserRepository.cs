using Microsoft.EntityFrameworkCore;
using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.Context;
using SolanaPvP.EF_Core.DBOs;
using SolanaPvP.EF_Core.Mappers;

namespace SolanaPvP.EF_Core.Repositories;

public class UserRepository : IUserRepository
{
    private readonly SolanaPvPDbContext _context;

    public UserRepository(SolanaPvPDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByPubkeyAsync(string pubkey)
    {
        var dbo = await _context.Users
            .Include(u => u.MatchParticipants)
            .FirstOrDefaultAsync(u => u.Pubkey == pubkey);

        return dbo?.ToDomain();
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        var dbo = await _context.Users
            .Include(u => u.MatchParticipants)
            .FirstOrDefaultAsync(u => u.Username == username);

        return dbo?.ToDomain();
    }

    public async Task<bool> IsUsernameAvailableAsync(string username)
    {
        return !await _context.Users.AnyAsync(u => u.Username == username);
    }

    public async Task<User> CreateOrUpdateAsync(User user)
    {
        var existingDbo = await _context.Users.FindAsync(user.Pubkey);
        
        if (existingDbo == null)
        {
            var newDbo = user.ToDBO();
            _context.Users.Add(newDbo);
            await _context.SaveChangesAsync();
            return newDbo.ToDomain();
        }
        else
        {
            existingDbo.Username = user.Username;
            existingDbo.Wins = user.Wins;
            existingDbo.Losses = user.Losses;
            existingDbo.TotalEarningsLamports = user.TotalEarningsLamports;
            existingDbo.MatchesPlayed = user.MatchesPlayed;
            existingDbo.LastSeen = user.LastSeen;
            existingDbo.LastUsernameChange = user.LastUsernameChange;
            
            _context.Users.Update(existingDbo);
            await _context.SaveChangesAsync();
            return existingDbo.ToDomain();
        }
    }

    public async Task UpdateStatsAsync(string pubkey, bool isWinner, long earningsLamports)
    {
        var user = await _context.Users.FindAsync(pubkey);
        if (user == null) return;

        if (isWinner)
        {
            user.Wins++;
        }
        else
        {
            user.Losses++;
        }

        user.MatchesPlayed++;
        user.TotalEarningsLamports += earningsLamports;
        user.LastSeen = DateTime.UtcNow;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ChangeUsernameAsync(string pubkey, string newUsername)
    {
        var user = await _context.Users.FindAsync(pubkey);
        if (user == null) return false;

        // Check if username is available
        if (!await IsUsernameAvailableAsync(newUsername))
        {
            return false;
        }

        user.Username = newUsername;
        user.LastUsernameChange = DateTime.UtcNow;
        
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CanChangeUsernameAsync(string pubkey)
    {
        var user = await _context.Users.FindAsync(pubkey);
        if (user == null) return false;

        if (user.LastUsernameChange == null) return true;

        var timeSinceLastChange = DateTime.UtcNow - user.LastUsernameChange.Value;
        return timeSinceLastChange.TotalHours >= 24;
    }

    public async Task<IEnumerable<User>> GetAllUsersAsync()
    {
        var dbos = await _context.Users.ToListAsync();
        return dbos.Select(dbo => dbo.ToDomain());
    }
}
