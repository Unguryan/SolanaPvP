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

            // Fetch match data from DB (SIMPLE!)
            var match = await _matchRepository.GetByMatchPdaAsync(matchPda);
            
            if (match == null)
            {
                throw new Exception($"Match not found in DB: {matchPda}");
            }

            // Get creator directly from match (no need to search!)
            var creator = match.CreatorPubkey;
            
            if (string.IsNullOrEmpty(creator))
            {
                throw new Exception($"Match {matchPda} has no creator pubkey");
            }

            // Get all participants pubkeys
            var participants = match.Participants
                .OrderBy(p => p.Side)
                .ThenBy(p => p.Position)
                .Select(p => p.Pubkey)
                .ToList();

            if (participants.Count == 0)
            {
                throw new Exception($"Match {matchPda} has no participants");
            }

            _logger.LogInformation("[ResolveSender] ✅ Match data ready - Creator: {Creator}, Participants: {Count}, Randomness: {Randomness}", 
                creator, participants.Count, randomnessAccount);

            // Prepare parameters for Node.js script
            // Base64 encode JSON to avoid command-line escaping issues
            var participantsJson = JsonConvert.SerializeObject(participants);
            var participantsBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(participantsJson));
            
            var args = new[]
            {
                matchPda,                              // lobbyPda
                creator,                               // creator (from match.CreatorPubkey!)
                randomnessAccount,                     // randomnessAccount
                participantsBase64,                    // participants as Base64-encoded JSON
                _solanaSettings.TreasuryPubkey,        // admin (fee receiver)
                _solanaSettings.AdminKeypairPath,      // keypairPath
                _solanaSettings.RpcPrimaryUrl,         // rpcUrl
                _solanaSettings.ProgramId              // programId
            };

            // Execute TypeScript script (SAME AS FRONTEND!)
            var signature = await _nodeExecutor.ExecuteAsync("send-resolve.ts", args);
            
            _logger.LogInformation("[ResolveSender] ✅ Resolve transaction sent: {Signature}", signature);
            
            return signature;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ResolveSender] Failed to send resolve for {MatchPda}", matchPda);
            throw;
        }
    }
}


