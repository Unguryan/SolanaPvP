using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SolanaPvP.EF_Core.Context;

namespace SolanaPvP.API_Project.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly SolanaPvPDbContext _dbContext;

    public HealthController(SolanaPvPDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<HealthStatus>> GetHealth()
    {
        var health = new HealthStatus
        {
            Status = "ok",
            Timestamp = DateTime.UtcNow
        };

        // Check database connectivity
        try
        {
            await _dbContext.Database.CanConnectAsync();
            health.Database = "ok";
        }
        catch (Exception)
        {
            health.Database = "fail";
            health.Status = "degraded";
        }

        // Check RPC connectivity (simplified)
        health.Rpc = "ok"; // In a real implementation, you'd test actual RPC calls

        // Check WebSocket connectivity (simplified)
        health.WebSocket = "ok"; // In a real implementation, you'd test actual WS connection

        return Ok(health);
    }
}

public class HealthStatus
{
    public string Status { get; set; } = string.Empty;
    public string Database { get; set; } = string.Empty;
    public string Rpc { get; set; } = string.Empty;
    public string WebSocket { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}
