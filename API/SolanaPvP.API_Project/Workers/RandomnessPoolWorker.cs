using SolanaPvP.Application.Interfaces.Services;
using Microsoft.Extensions.Options;
using SolanaPvP.Domain.Settings;

namespace SolanaPvP.API_Project.Workers;

public class RandomnessPoolWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly SwitchboardSettings _settings;
    private readonly ILogger<RandomnessPoolWorker> _logger;

    public RandomnessPoolWorker(
        IServiceProvider serviceProvider,
        IOptions<SwitchboardSettings> settings,
        ILogger<RandomnessPoolWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _settings = settings.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RandomnessPoolWorker started");

        // Wait a bit for other services to initialize
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        // Initialize pool on startup
        using (var scope = _serviceProvider.CreateScope())
        {
            var poolService = scope.ServiceProvider.GetRequiredService<IRandomnessPoolService>();
            
            try
            {
                _logger.LogInformation("[RandomnessPoolWorker] Initializing randomness account pool...");
                await poolService.InitializePoolAsync(_settings.PoolInitialSize);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RandomnessPoolWorker] Failed to initialize pool on startup");
            }
        }

        // Main loop - run maintenance tasks every minute
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

                using var scope = _serviceProvider.CreateScope();
                var poolService = scope.ServiceProvider.GetRequiredService<IRandomnessPoolService>();

                // 1. Process cooldown accounts
                await poolService.ProcessCooldownAccountsAsync();

                // 2. Cleanup invalid accounts
                await poolService.CleanupInvalidAccountsAsync();

                // 3. Ensure minimum pool size (create new accounts if needed)
                // This will be handled automatically by GetAvailableAccountAsync when exhausted
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RandomnessPoolWorker] Error in maintenance loop");
            }
        }

        _logger.LogInformation("RandomnessPoolWorker stopped");
    }
}

