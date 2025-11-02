using Microsoft.AspNetCore.Mvc;
using SolanaPvP.Application.Interfaces.Services;

namespace SolanaPvP.API_Project.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RandomnessController : ControllerBase
{
    private readonly IRandomnessPoolService _poolService;
    private readonly ILogger<RandomnessController> _logger;

    public RandomnessController(
        IRandomnessPoolService poolService,
        ILogger<RandomnessController> logger)
    {
        _poolService = poolService;
        _logger = logger;
    }

    /// <summary>
    /// Get an available randomness account from the pool
    /// </summary>
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableAccount()
    {
        try
        {
            var account = await _poolService.GetAvailableAccountAsync();
            
            if (account == null)
            {
                _logger.LogWarning("[RandomnessApi] No randomness accounts available in pool");
                return StatusCode(503, new { error = "No randomness accounts available. Please try again later." });
            }

            _logger.LogInformation("[RandomnessApi] Allocated randomness account {Account}", account);

            return Ok(new { randomnessAccount = account });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RandomnessApi] Failed to get available randomness account");
            return StatusCode(500, new { error = "Failed to allocate randomness account" });
        }
    }

    /// <summary>
    /// Get pool statistics (for admin/debugging)
    /// </summary>
    [HttpGet("pool/stats")]
    public async Task<IActionResult> GetPoolStats()
    {
        try
        {
            // This would need additional repository methods
            // For now, return basic info
            return Ok(new
            {
                message = "Pool statistics endpoint - to be implemented"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RandomnessApi] Failed to get pool stats");
            return StatusCode(500, new { error = "Failed to get pool statistics" });
        }
    }
}

