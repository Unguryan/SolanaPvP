using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;
using SolanaPvP.Application.Interfaces.Repositories;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace SolanaPvP.SolanaRPC.Services;

public class ResolveSender : IResolveSender
{
    private readonly SolanaSettings _solanaSettings;
    private readonly ILogger<ResolveSender> _logger;
    private readonly NodeScriptExecutor _nodeExecutor;
    private readonly IMatchRepository _matchRepository;

    public ResolveSender(
        SolanaSettings solanaSettings,
        ILogger<ResolveSender> logger,
        NodeScriptExecutor nodeExecutor,
        IMatchRepository matchRepository)
    {
        _solanaSettings = solanaSettings;
        _logger = logger;
        _nodeExecutor = nodeExecutor;
        _matchRepository = matchRepository;
    }

    public async Task<string> SendResolveMatchAsync(string matchPda, string randomnessAccount)
    {
        try
        {
            _logger.LogInformation("[ResolveSender] Resolving match {MatchPda} with randomness {RandomnessAccount}", 
                matchPda, randomnessAccount);

            // Fetch lobby data from blockchain to get creator and participants
            var lobbyData = await FetchLobbyDataAsync(matchPda);
            
            if (lobbyData == null)
            {
                throw new Exception($"Failed to fetch lobby data for {matchPda}");
            }

            // Prepare parameters for Node.js script
            var participantsJson = JsonConvert.SerializeObject(lobbyData.Participants);
            
            var args = new[]
            {
                matchPda,                              // lobbyPda
                lobbyData.Creator,                     // creator
                randomnessAccount,                     // randomnessAccount
                participantsJson,                      // participants as JSON (team1 + team2)
                _solanaSettings.TreasuryPubkey,        // admin (fee receiver)
                _solanaSettings.AdminKeypairPath,      // keypairPath
                _solanaSettings.RpcPrimaryUrl,         // rpcUrl
                _solanaSettings.ProgramId              // programId
            };

            // Execute Node.js script
            var signature = await _nodeExecutor.ExecuteAsync("send-resolve.js", args);
            
            _logger.LogInformation("[ResolveSender] ✅ Resolve transaction sent: {Signature}", signature);
            
            return signature;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ResolveSender] Failed to send resolve for {MatchPda}", matchPda);
            throw;
        }
    }

    private async Task<LobbyData?> FetchLobbyDataAsync(string lobbyPda)
    {
        try
        {
            _logger.LogDebug("[ResolveSender] Fetching match data from DB for {LobbyPda}", lobbyPda);
            
            // Get match data from database (IndexerWorker already tracked all participants)
            var match = await _matchRepository.GetByMatchPdaAsync(lobbyPda);
            
            if (match == null)
            {
                _logger.LogWarning("[ResolveSender] Match not found in DB: {LobbyPda}", lobbyPda);
                return null;
            }

            // Extract creator - first participant with side 0, position 0
            var creator = match.Participants.FirstOrDefault(p => p.Side == 0 && p.Position == 0)?.Pubkey;
            
            if (string.IsNullOrEmpty(creator))
            {
                _logger.LogWarning("[ResolveSender] Creator not found for match {LobbyPda}", lobbyPda);
                return null;
            }

            // Get all participants (team1 + team2 in correct order)
            var participants = match.Participants
                .OrderBy(p => p.Side) // Team1 (side 0) first, then Team2 (side 1)
                .ThenBy(p => p.Position)
                .Select(p => p.Pubkey)
                .ToList();

            _logger.LogDebug("[ResolveSender] Found {Count} participants for match {LobbyPda}", participants.Count, lobbyPda);

            return new LobbyData
            {
                Creator = creator,
                Participants = participants
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ResolveSender] Failed to fetch lobby data for {LobbyPda}", lobbyPda);
            return null;
        }
    }

    private class LobbyData
    {
        public string Creator { get; set; } = string.Empty;
        public List<string> Participants { get; set; } = new();
    }
}


