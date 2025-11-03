using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Settings;
using SolanaPvP.Application.Interfaces.Repositories;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace SolanaPvP.SolanaRPC.Services;

public class RefundSender : IRefundSender
{
    private readonly SolanaSettings _solanaSettings;
    private readonly ILogger<RefundSender> _logger;
    private readonly NodeScriptExecutor _nodeExecutor;
    private readonly IMatchRepository _matchRepository;

    public RefundSender(
        SolanaSettings solanaSettings,
        ILogger<RefundSender> logger,
        NodeScriptExecutor nodeExecutor,
        IMatchRepository matchRepository)
    {
        _solanaSettings = solanaSettings;
        _logger = logger;
        _nodeExecutor = nodeExecutor;
        _matchRepository = matchRepository;
    }

    public async Task<string> SendRefundAsync(string matchPda)
    {
        try
        {
            _logger.LogInformation("[RefundSender] Sending refund for match {MatchPda}", matchPda);

            // Fetch lobby data from blockchain to get creator and participants
            var lobbyData = await FetchLobbyDataAsync(matchPda);
            
            if (lobbyData == null)
            {
                throw new Exception($"Failed to fetch lobby data for {matchPda}");
            }

            // Prepare parameters for Node.js script
            // Base64 encode JSON to avoid command-line escaping issues
            var participantsJson = JsonConvert.SerializeObject(lobbyData.Participants);
            var participantsBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(participantsJson));
            
            var args = new[]
            {
                matchPda,                              // lobbyPda
                lobbyData.Creator,                     // creator
                participantsBase64,                    // participants as Base64-encoded JSON
                _solanaSettings.AdminKeypairPath,      // keypairPath
                _solanaSettings.RpcPrimaryUrl,         // rpcUrl
                _solanaSettings.ProgramId              // programId
            };

            // Execute TypeScript script (SAME AS FRONTEND!)
            var signature = await _nodeExecutor.ExecuteAsync("send-refund.ts", args);
            
            _logger.LogInformation("[RefundSender] ✅ Refund transaction sent: {Signature}", signature);
            
            return signature;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RefundSender] Failed to send refund for match {MatchPda}", matchPda);
            throw;
        }
    }

    private async Task<LobbyData?> FetchLobbyDataAsync(string lobbyPda)
    {
        try
        {
            _logger.LogDebug("[RefundSender] Fetching match data from DB for {LobbyPda}", lobbyPda);
            
            // Get match data from database (IndexerWorker already tracked all participants)
            var match = await _matchRepository.GetByMatchPdaAsync(lobbyPda);
            
            if (match == null)
            {
                _logger.LogWarning("[RefundSender] Match not found in DB: {LobbyPda}", lobbyPda);
                return null;
            }

            // Extract creator - first participant with side 0, position 0
            var creator = match.Participants.FirstOrDefault(p => p.Side == 0 && p.Position == 0)?.Pubkey;
            
            if (string.IsNullOrEmpty(creator))
            {
                _logger.LogWarning("[RefundSender] Creator not found for match {LobbyPda}", lobbyPda);
                return null;
            }

            // Get all participants (team1 + team2)
            var participants = match.Participants
                .OrderBy(p => p.Side) // Team1 first, then Team2
                .ThenBy(p => p.Position)
                .Select(p => p.Pubkey)
                .ToList();

            return new LobbyData
            {
                Creator = creator,
                Participants = participants
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RefundSender] Failed to fetch lobby data for {LobbyPda}", lobbyPda);
            return null;
        }
    }

    public async Task<string> SendRefundUnsafeAsync(string lobbyPda, string creator, List<string> participants)
    {
        try
        {
            _logger.LogWarning("[RefundSender] UNSAFE MODE: Sending refund with manual parameters for {LobbyPda}", lobbyPda);

            // Prepare parameters for Node.js script
            // Base64 encode JSON to avoid command-line escaping issues
            var participantsJson = JsonConvert.SerializeObject(participants);
            var participantsBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(participantsJson));
            
            var args = new[]
            {
                lobbyPda,                              // lobbyPda
                creator,                               // creator
                participantsBase64,                    // participants as Base64-encoded JSON
                _solanaSettings.AdminKeypairPath,      // keypairPath
                _solanaSettings.RpcPrimaryUrl,         // rpcUrl
                _solanaSettings.ProgramId              // programId
            };

            // Execute TypeScript script (SAME AS FRONTEND!)
            var signature = await _nodeExecutor.ExecuteAsync("send-refund.ts", args);
            
            _logger.LogInformation("[RefundSender] ✅ UNSAFE refund transaction sent: {Signature}", signature);
            
            return signature;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RefundSender] Failed to send unsafe refund for {LobbyPda}", lobbyPda);
            throw;
        }
    }

    private class LobbyData
    {
        public string Creator { get; set; } = string.Empty;
        public List<string> Participants { get; set; } = new();
    }
}

