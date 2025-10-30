using SolanaPvP.Domain.Models;

namespace SolanaPvP.Application.Interfaces.Repositories;

public interface IMatchInvitationRepository
{
    Task<MatchInvitation> CreateAsync(MatchInvitation invitation);
    Task<MatchInvitation?> GetByIdAsync(int id);
    Task<MatchInvitation> UpdateAsync(MatchInvitation invitation);
    Task<IEnumerable<MatchInvitation>> GetUserInvitationsAsync(string pubkey, int? status = null);
    Task<IEnumerable<MatchInvitation>> GetExpiredInvitationsAsync();
}
