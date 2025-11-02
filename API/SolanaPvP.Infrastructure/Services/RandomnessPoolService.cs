using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SolanaPvP.Application.Interfaces.Repositories;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;
using SolanaPvP.Domain.Settings;

namespace SolanaPvP.Infrastructure.Services;

public class RandomnessPoolService : IRandomnessPoolService
{
    private readonly IRandomnessPoolRepository _repository;
    private readonly ISwitchboardApiClient _switchboardApi;
    private readonly SwitchboardSettings _settings;
    private readonly ILogger<RandomnessPoolService> _logger;
    private readonly SemaphoreSlim _poolLock = new(1, 1);

    public RandomnessPoolService(
        IRandomnessPoolRepository repository,
        ISwitchboardApiClient switchboardApi,
        IOptions<SwitchboardSettings> settings,
        ILogger<RandomnessPoolService> logger)
    {
        _repository = repository;
        _switchboardApi = switchboardApi;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<string?> GetAvailableAccountAsync()
    {
        await _poolLock.WaitAsync();
        try
        {
            // Try to get existing available account
            var account = await _repository.GetAvailableAccountAsync();
            
            if (account != null)
            {
                // Mark as InUse
                await _repository.MarkInUseAsync(account.AccountPubkey);
                _logger.LogInformation("[RandomnessPool] Allocated account {Account}", account.AccountPubkey);
                return account.AccountPubkey;
            }

            // No available accounts - try to create new one
            var totalCount = await _repository.GetTotalCountAsync();
            if (totalCount >= _settings.PoolMaxSize)
            {
                _logger.LogWarning("[RandomnessPool] Pool exhausted! Total: {Total}, Max: {Max}", 
                    totalCount, _settings.PoolMaxSize);
                return null;
            }

            // Create new account
            _logger.LogInformation("[RandomnessPool] No available accounts, creating new one...");
            var created = await CreatePoolAccountAsync();
            
            if (!created)
            {
                return null;
            }

            // Get the newly created account
            account = await _repository.GetAvailableAccountAsync();
            if (account == null)
            {
                return null;
            }

            await _repository.MarkInUseAsync(account.AccountPubkey);
            return account.AccountPubkey;
        }
        finally
        {
            _poolLock.Release();
        }
    }

    public async Task ReturnAccountAsync(string accountPubkey, int cooldownMinutes)
    {
        try
        {
            await _repository.MarkCooldownAsync(accountPubkey, cooldownMinutes);
            _logger.LogInformation("[RandomnessPool] Account {Account} returned to pool with {Minutes}min cooldown", 
                accountPubkey, cooldownMinutes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RandomnessPool] Failed to return account {Account} to pool", accountPubkey);
        }
    }

    public async Task<bool> CreatePoolAccountAsync()
    {
        try
        {
            // Call Switchboard API to create randomness account
            var accountPubkey = await _switchboardApi.CreateRandomnessAccountAsync();
            
            if (string.IsNullOrWhiteSpace(accountPubkey))
            {
                _logger.LogError("[RandomnessPool] Failed to create randomness account: empty pubkey");
                return false;
            }

            // Add to database
            var account = new RandomnessPoolAccount
            {
                AccountPubkey = accountPubkey,
                Status = RandomnessAccountStatus.Available,
                CreatedAt = DateTime.UtcNow,
                LastUsedAt = null,
                CooldownUntil = null
            };

            await _repository.CreateAsync(account);
            _logger.LogInformation("[RandomnessPool] Created and added account {Account} to pool", accountPubkey);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RandomnessPool] Failed to create pool account");
            return false;
        }
    }

    public async Task InitializePoolAsync(int targetSize)
    {
        await _poolLock.WaitAsync();
        try
        {
            _logger.LogInformation("[RandomnessPool] Initializing pool with target size {TargetSize}", targetSize);

            var currentCount = await _repository.GetTotalCountAsync();
            _logger.LogInformation("[RandomnessPool] Current pool size: {Current}", currentCount);

            var toCreate = Math.Min(targetSize - currentCount, _settings.PoolMaxSize - currentCount);
            
            if (toCreate <= 0)
            {
                _logger.LogInformation("[RandomnessPool] Pool already initialized");
                return;
            }

            _logger.LogInformation("[RandomnessPool] Creating {Count} randomness accounts...", toCreate);

            var tasks = new List<Task<bool>>();
            for (int i = 0; i < toCreate; i++)
            {
                tasks.Add(CreatePoolAccountAsync());
                // Small delay to avoid rate limiting
                await Task.Delay(500);
            }

            var results = await Task.WhenAll(tasks);
            var successCount = results.Count(r => r);

            _logger.LogInformation("[RandomnessPool] Pool initialization complete: {Success}/{Total} accounts created", 
                successCount, toCreate);
        }
        finally
        {
            _poolLock.Release();
        }
    }

    public Task CleanupInvalidAccountsAsync()
    {
        try
        {
            // TODO: Implement validation logic
            // For now, just log
            _logger.LogDebug("[RandomnessPool] Cleanup task executed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RandomnessPool] Failed to cleanup invalid accounts");
        }
        
        return Task.CompletedTask;
    }

    public async Task ProcessCooldownAccountsAsync()
    {
        try
        {
            var expiredAccounts = await _repository.GetCooldownExpiredAccountsAsync();
            
            if (expiredAccounts.Count == 0)
            {
                return;
            }

            _logger.LogInformation("[RandomnessPool] Processing {Count} cooldown expired accounts", expiredAccounts.Count);

            foreach (var account in expiredAccounts)
            {
                await _repository.UpdateStatusAsync(account.AccountPubkey, RandomnessAccountStatus.Available);
                _logger.LogDebug("[RandomnessPool] Account {Account} moved from Cooldown to Available", account.AccountPubkey);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RandomnessPool] Failed to process cooldown accounts");
        }
    }
}

