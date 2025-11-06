using Microsoft.EntityFrameworkCore;
using SolanaPvP.Application.Interfaces.Repositories;
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
        if (user == null)
        {
            // User not found - create a new user automatically
            var newUser = new UserDBO
            {
                Pubkey = pubkey,
                Username = $"user_{new Random().Next(100000, 999999)}",
                Wins = isWinner ? 1 : 0,
                Losses = isWinner ? 0 : 1,
                MatchesPlayed = 1,
                TotalEarningsLamports = earningsLamports,
                FirstSeen = DateTime.UtcNow,
                LastSeen = DateTime.UtcNow,
                CanChangeUsername = true
            };
            
            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();
            return;
        }

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

    public async Task<User> CreateUserAsync(User user)
    {
        var dbo = user.ToDBO();
        _context.Users.Add(dbo);
        await _context.SaveChangesAsync();
        return dbo.ToDomain();
    }

    public async Task UpdateLastSeenAsync(string pubkey)
    {
        var user = await _context.Users.FindAsync(pubkey);
        
        if (user == null)
        {
            // User doesn't exist - create with auto-generated username
            var username = $"user_{new Random().Next(100000, 999999)}";
            
            var newUser = new UserDBO
            {
                Pubkey = pubkey,
                FirstSeen = DateTime.UtcNow,
                LastSeen = DateTime.UtcNow,
                Username = username, // Auto-generate username immediately
                Wins = 0,
                Losses = 0,
                MatchesPlayed = 0,
                TotalEarningsLamports = 0,
                CanChangeUsername = true
            };
            _context.Users.Add(newUser);
        }
        else
        {
            // User exists - only update LastSeen (don't overwrite username or other data)
            user.LastSeen = DateTime.UtcNow;
            _context.Users.Update(user);
        }
        
        await _context.SaveChangesAsync();
    }
}
