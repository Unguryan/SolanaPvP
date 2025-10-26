using Microsoft.AspNetCore.Mvc;
using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.API_Project.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IMatchService _matchService;

    public UsersController(IMatchService matchService)
    {
        _matchService = matchService;
    }

    [HttpGet("{pubkey}")]
    public async Task<ActionResult<UserProfile>> GetUser(string pubkey)
    {
        var user = await _matchService.GetUserAsync(pubkey);
        if (user == null)
        {
            return NotFound($"User with pubkey {pubkey} not found");
        }

        return Ok(user);
    }
}
