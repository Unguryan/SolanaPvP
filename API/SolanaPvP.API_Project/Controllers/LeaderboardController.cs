using Microsoft.AspNetCore.Mvc;
using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.API_Project.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeaderboardController : ControllerBase
{
    private readonly IMatchService _matchService;

    public LeaderboardController(IMatchService matchService)
    {
        _matchService = matchService;
    }

    [HttpGet]
    public async Task<ActionResult<LeaderboardResult>> GetLeaderboard(
        [FromQuery] LeaderboardType type = LeaderboardType.WinRate,
        [FromQuery] LeaderboardPeriod period = LeaderboardPeriod.AllTime,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var paging = new Paging
        {
            Page = page,
            PageSize = Math.Min(pageSize, 100) // Limit max page size
        };

        var result = await _matchService.GetLeaderboardAsync(type, period, paging);
        return Ok(result);
    }

    [HttpGet("winrate")]
    public async Task<ActionResult<LeaderboardResult>> GetWinRateLeaderboard(
        [FromQuery] LeaderboardPeriod period = LeaderboardPeriod.AllTime,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var paging = new Paging
        {
            Page = page,
            PageSize = Math.Min(pageSize, 100)
        };

        var result = await _matchService.GetLeaderboardAsync(LeaderboardType.WinRate, period, paging);
        return Ok(result);
    }

    [HttpGet("earnings")]
    public async Task<ActionResult<LeaderboardResult>> GetEarningsLeaderboard(
        [FromQuery] LeaderboardPeriod period = LeaderboardPeriod.AllTime,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var paging = new Paging
        {
            Page = page,
            PageSize = Math.Min(pageSize, 100)
        };

        var leaderboardType = period == LeaderboardPeriod.Monthly 
            ? LeaderboardType.MonthlyEarnings 
            : LeaderboardType.TotalEarnings;

        var result = await _matchService.GetLeaderboardAsync(leaderboardType, period, paging);
        return Ok(result);
    }
}
