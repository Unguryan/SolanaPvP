using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using SolanaPvP.Application.Interfaces.SolanaRPC;
using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Settings;
using SolanaPvP.SolanaRPC.Internal.Models;

namespace SolanaPvP.SolanaRPC.Services;

public class EventParser : IEventParser
{
    private readonly SolanaSettings _solanaSettings;
    private readonly ILogger<EventParser> _logger;

    public EventParser(SolanaSettings solanaSettings, ILogger<EventParser> logger)
    {
        _solanaSettings = solanaSettings;
        _logger = logger;
    }

    public bool IsOurProgram(string programId)
    {
        return programId == _solanaSettings.ProgramId;
    }

    public SolanaPvP.Application.Interfaces.SolanaRPC.ParsedEvent? ParseProgramLog(string logLine)
    {
        try
        {
            _logger.LogDebug("[EventParser] Parsing log line: {LogLine}", logLine);
            
            // Anchor events appear as "Program data: <base64_data>"
            if (!logLine.Contains("Program data:")) 
            {
                return null;
            }
            
            // Extract base64 data
            var base64Data = ExtractBase64Data(logLine);
            if (string.IsNullOrEmpty(base64Data))
            {
                _logger.LogDebug("[EventParser] Could not extract base64 data");
                return null;
            }

            _logger.LogDebug("[EventParser] Extracted base64 data: {Data}", base64Data);

            // Decode and parse
            return ParseAnchorEventData(base64Data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EventParser] Error parsing log line: {LogLine}", logLine);
            return null;
        }
    }

    private string? ExtractBase64Data(string logLine)
    {
        // Format: "Program data: <base64_string>"
        const string prefix = "Program data: ";
        var startIndex = logLine.IndexOf(prefix, StringComparison.Ordinal);
        if (startIndex == -1) return null;

        var dataStart = startIndex + prefix.Length;
        return logLine.Substring(dataStart).Trim();
    }

    private SolanaPvP.Application.Interfaces.SolanaRPC.ParsedEvent? ParseAnchorEventData(string base64Data)
    {
        try
        {
            var bytes = Convert.FromBase64String(base64Data);
            _logger.LogDebug("[EventParser] Decoded {Length} bytes", bytes.Length);

            if (bytes.Length < 8)
            {
                _logger.LogDebug("[EventParser] Data too short (need at least 8 bytes for discriminator)");
                return null;
            }

            // First 8 bytes are the discriminator
            var discriminator = new byte[8];
            Array.Copy(bytes, 0, discriminator, 0, 8);
            
            var discriminatorHex = BitConverter.ToString(discriminator).Replace("-", "").ToLower();
            _logger.LogDebug("[EventParser] Event discriminator: {Discriminator}", discriminatorHex);

            // Map discriminator to event kind
            // These are the first 8 bytes of SHA256("event:LobbyCreated"), etc.
            // You may need to compute these from your actual program
            var (eventKind, eventName) = GetEventKindFromDiscriminator(discriminator);
            
            if (!eventKind.HasValue)
            {
                _logger.LogDebug("[EventParser] Unknown event discriminator: {Discriminator}", discriminatorHex);
                return null;
            }

            _logger.LogInformation("[EventParser] ✅ Detected {EventName} event!", eventName);

            // For now, store the full base64 as payload
            // TODO: Properly deserialize Borsh-encoded event data
            var payload = new
            {
                eventType = eventName,
                rawData = base64Data,
                discriminator = discriminatorHex
            };

            return new SolanaPvP.Application.Interfaces.SolanaRPC.ParsedEvent
            {
                Kind = eventKind.Value,
                MatchPda = ExtractLobbyPdaFromData(bytes) ?? "unknown", // Try to extract lobby PDA
                PayloadJson = JsonConvert.SerializeObject(payload)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EventParser] Error parsing event data");
            return null;
        }
    }

    private (EventKind?, string) GetEventKindFromDiscriminator(byte[] discriminator)
    {
        // Anchor event discriminators are: first 8 bytes of SHA256("event:<EventName>")
        // These discriminators are extracted from actual on-chain events
        
        var discHex = BitConverter.ToString(discriminator).Replace("-", "").ToLower();
        
        // Map known discriminators from Solana events
        return discHex switch
        {
            "6da91032a9f2ed41" => (EventKind.MatchCreated, "LobbyCreated"),
            "2790316a6cd2b726" => (EventKind.MatchJoined, "PlayerJoined"),
            "2563224caff103ae" => (EventKind.MatchRefunded, "LobbyRefunded"),
            // Add more discriminators as we discover them from on-chain events:
            // LobbyResolved discriminator will be added when observed
            _ => (null, $"Unknown (discriminator: {discHex})")
        };
    }

    private string? ExtractLobbyPdaFromData(byte[] data)
    {
        try
        {
            // Skip discriminator (8 bytes), lobby pubkey is typically the first field
            if (data.Length < 40) return null; // 8 + 32 bytes minimum
            
            var pubkeyBytes = new byte[32];
            Array.Copy(data, 8, pubkeyBytes, 0, 32);
            
            // Convert to base58 (Solana pubkey format)
            return Base58Encode(pubkeyBytes);
        }
        catch
        {
            return null;
        }
    }

    private static string Base58Encode(byte[] data)
    {
        const string alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        var intData = data.Aggregate<byte, System.Numerics.BigInteger>(0, (current, t) => current * 256 + t);
        var result = string.Empty;
        while (intData > 0)
        {
            var remainder = (int)(intData % 58);
            intData /= 58;
            result = alphabet[remainder] + result;
        }
        
        foreach (var b in data)
        {
            if (b == 0)
                result = '1' + result;
            else
                break;
        }
        
        return result;
    }
}
