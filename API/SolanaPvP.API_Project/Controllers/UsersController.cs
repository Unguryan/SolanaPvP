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
        if (user == null)
        {
            return NotFound($"User with pubkey {pubkey} not found");
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
}

public class ChangeUsernameRequest
{
    public string Username { get; set; } = string.Empty;
}
