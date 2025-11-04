using Microsoft.AspNetCore.SignalR;
using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.API_Project.Hubs;

public class MatchHub : Hub
{
    private readonly IMatchService _matchService;

    public MatchHub(IMatchService matchService)
    {
        _matchService = matchService;
    }

    public async Task JoinMatchGroup(string matchPda)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"match_{matchPda}");
    }

    public async Task LeaveMatchGroup(string matchPda)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"match_{matchPda}");
    }

    public async Task JoinLobby()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "lobby");
    }

    public async Task LeaveLobby()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "lobby");
    }
}

public static class MatchHubExtensions
{
    public static async Task NotifyMatchCreated(this IHubContext<MatchHub> hubContext, MatchView match)
    {
        // Send to ALL connected clients (no groups!)
        await hubContext.Clients.All.SendAsync("matchCreated", match);
    }

    public static async Task NotifyMatchJoined(this IHubContext<MatchHub> hubContext, string matchPda, MatchView match)
    {
        // Send to ALL connected clients (no groups!)
        await hubContext.Clients.All.SendAsync("matchJoined", match);
    }

    public static async Task NotifyMatchResolved(this IHubContext<MatchHub> hubContext, string matchPda, MatchDetails match)
    {
        // Send to ALL connected clients (no groups!)
        await hubContext.Clients.All.SendAsync("matchResolved", match);
    }

    public static async Task NotifyMatchRefunded(this IHubContext<MatchHub> hubContext, string matchPda, MatchView match)
    {
        // Send to ALL connected clients (no groups!)
        await hubContext.Clients.All.SendAsync("matchRefunded", match);
    }
}
