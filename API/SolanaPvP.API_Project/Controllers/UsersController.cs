using Microsoft.AspNetCore.Mvc;
using SolanaPvP.API_Project.Extensions;
using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.API_Project.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IMatchService _matchService;
    private readonly IUsernameService _usernameService;

    public UsersController(IMatchService matchService, IUsernameService usernameService)
    {
        _matchService = matchService;
        _usernameService = usernameService;
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserProfile>> GetCurrentUser()
    {
        var pubkey = HttpContext.GetRequiredUserPubkey();
        var user = await _matchService.GetUserAsync(pubkey);
        
        // If user doesn't exist, create a new one automatically
        if (user == null)
        {
            user = await _matchService.CreateUserAsync(pubkey);
        }

        return Ok(user);
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

    [HttpGet("username/{username}")]
    public async Task<ActionResult<UserProfile>> GetUserByUsername(string username)
    {
        var user = await _matchService.GetUserByUsernameAsync(username);
        if (user == null)
        {
            return NotFound($"User with username {username} not found");
        }

        return Ok(user);
    }

    [HttpPost("me/username")]
    public async Task<ActionResult> ChangeUsername([FromBody] ChangeUsernameRequest request)
    {
        var pubkey = HttpContext.GetRequiredUserPubkey();
        
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            return BadRequest("Username cannot be empty");
        }

        if (!await _usernameService.CanChangeUsernameAsync(pubkey))
        {
            return BadRequest("Username can only be changed once every 24 hours");
        }

        if (!await _usernameService.IsUsernameAvailableAsync(request.Username))
        {
            return BadRequest("Username is already taken");
        }

        var success = await _usernameService.ChangeUsernameAsync(pubkey, request.Username);
        if (!success)
        {
            return BadRequest("Failed to change username");
        }

        return Ok(new { message = "Username changed successfully" });
    }

    [HttpGet("username/available")]
    public async Task<ActionResult> CheckUsernameAvailability([FromQuery] string username)
    {
        var isAvailable = await _usernameService.IsUsernameAvailableAsync(username);
        return Ok(new { username, isAvailable });
    }

    [HttpPost("register")]
    public async Task<ActionResult<UserProfile>> RegisterUser([FromBody] RegisterUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Pubkey))
        {
            return BadRequest("Pubkey is required");
        }

        // Check if user already exists
        var existingUser = await _matchService.GetUserAsync(request.Pubkey);
        if (existingUser != null)
        {
            return Ok(existingUser);
        }

        // Create new user with auto-generated username
        var newUser = await _matchService.CreateUserAsync(request.Pubkey);
        return Ok(newUser);
    }

    [HttpGet("{pubkey}/matches")]
    public async Task<ActionResult<PagedResult<MatchView>>> GetUserMatches(
        string pubkey,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var paging = new Paging
        {
            Page = page,
            PageSize = Math.Min(pageSize, 50)
        };
        
        var result = await _matchService.GetUserMatchesAsync(pubkey, paging);
        return Ok(result);
    }

    [HttpGet("{pubkey}/statistics")]
    public async Task<ActionResult<UserStatistics>> GetUserStatistics(
        string pubkey,
        [FromQuery] StatisticsPeriod period = StatisticsPeriod.AllTime)
    {
        var stats = await _matchService.GetUserStatisticsAsync(pubkey, period);
        if (stats == null)
        {
            return NotFound($"User with pubkey {pubkey} not found");
        }
        return Ok(stats);
    }
}

public class ChangeUsernameRequest
{
    public string Username { get; set; } = string.Empty;
}

public class RegisterUserRequest
{
    public string Pubkey { get; set; } = string.Empty;
}
