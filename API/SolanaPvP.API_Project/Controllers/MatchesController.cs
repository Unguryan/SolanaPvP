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
        [FromQuery] string? gameMode,
        [FromQuery] string? matchType,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var filter = new MatchFilter
        {
            Status = status,
            GameMode = gameMode,
            MatchType = matchType
        };

        var paging = new Paging
        {
            Page = page,
            PageSize = Math.Min(pageSize, 100) // Limit max page size
        };

        var result = await _matchService.GetMatchesAsync(filter, paging);
        return Ok(result);
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
