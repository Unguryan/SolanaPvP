using Microsoft.AspNetCore.Mvc;
using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.API_Project.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MatchesController : ControllerBase
{
    private readonly IMatchService _matchService;

    public MatchesController(IMatchService matchService)
    {
        _matchService = matchService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<MatchView>>> GetMatches(
        [FromQuery] int? status,
        [FromQuery] string? gameType,
        [FromQuery] string? gameMode,
        [FromQuery] string? matchMode,
        [FromQuery] string? teamSize,
        [FromQuery] bool? isPrivate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var filter = new MatchFilter
        {
            Status = status,
            GameType = gameType,
            GameMode = gameMode,
            MatchMode = matchMode,
            TeamSize = teamSize,
            IsPrivate = isPrivate
        };

        var paging = new Paging
        {
            Page = page,
            PageSize = Math.Min(pageSize, 100) // Limit max page size
        };

        var result = await _matchService.GetMatchesAsync(filter, paging);
        return Ok(result);
    }

    [HttpGet("active")]
    public async Task<ActionResult<PagedResult<MatchView>>> GetActiveMatches(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var paging = new Paging
        {
            Page = page,
            PageSize = Math.Min(pageSize, 100)
        };

        var result = await _matchService.GetActiveMatchesAsync(paging);
        return Ok(result);
    }

    [HttpGet("recent")]
    public async Task<ActionResult<List<MatchView>>> GetRecentMatches([FromQuery] int count = 10)
    {
        var matches = await _matchService.GetRecentResolvedMatchesAsync(Math.Min(count, 50));
        return Ok(matches);
    }

    [HttpGet("{matchPda}")]
    public async Task<ActionResult<MatchDetails>> GetMatch(string matchPda)
    {
        var match = await _matchService.GetMatchAsync(matchPda);
        if (match == null)
        {
            return NotFound($"Match with PDA {matchPda} not found");
        }

        return Ok(match);
    }
}
